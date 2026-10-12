(function () {
  'use strict';

  const COLS = [
    { id: 'todo', name: 'To do' },
    { id: 'doing', name: 'Doing' },
    { id: 'done', name: 'Done' }
  ];
  const COL_NAME = {};
  COLS.forEach(function (c) { COL_NAME[c.id] = c.name; });
  const DATA_KEY = 'laneboard.v1';
  const THEME_KEY = 'laneboard.theme';
  const NS = 'http://www.w3.org/2000/svg';

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }
  };

  const ICONS = {
    logo: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z',
    search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM20 20l-4-4',
    close: 'M6 6l12 12M18 6L6 18',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    upload: 'M12 16V5M7 10l5-5 5 5M5 20h14',
    sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
    move: 'M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4',
    notes: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'
  };

  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'icon');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', ICONS[name]);
    svg.appendChild(p);
    return svg;
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  const isMobile = function () { return window.matchMedia('(max-width: 719px)').matches; };

  /* ---------- Data ---------- */
  function emptyState() { return { cards: {}, columns: { todo: [], doing: [], done: [] } }; }

  function normalize(data) {
    if (!data || typeof data !== 'object' || !data.cards || typeof data.cards !== 'object' ||
        !data.columns || typeof data.columns !== 'object') return null;
    const out = emptyState();
    const seen = new Set();
    const own = function (id) { return id !== '__proto__' && Object.prototype.hasOwnProperty.call(data.cards, id); };
    const clean = function (raw, id) {
      if (!raw || typeof raw !== 'object' || typeof raw.title !== 'string' || !raw.title.trim()) return null;
      return {
        id: id,
        title: raw.title.trim().slice(0, 200),
        notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 5000) : '',
        due: typeof raw.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.due) ? raw.due : ''
      };
    };
    const place = function (id, col) {
      if (typeof id !== 'string' || seen.has(id) || !own(id)) return;
      const card = clean(data.cards[id], id);
      if (!card) return;
      seen.add(id);
      out.cards[id] = card;
      out.columns[col].push(id);
    };
    COLS.forEach(function (c) {
      const ids = Array.isArray(data.columns[c.id]) ? data.columns[c.id] : [];
      ids.forEach(function (id) { place(id, c.id); });
    });
    Object.keys(data.cards).forEach(function (id) { place(id, 'todo'); });
    return out;
  }

  function load() {
    const raw = store.get(DATA_KEY);
    if (!raw) return emptyState();
    try { return normalize(JSON.parse(raw)) || emptyState(); } catch (e) { return emptyState(); }
  }

  let state = load();
  let saveWarned = false;

  function save() {
    if (!store.set(DATA_KEY, JSON.stringify(state)) && !saveWarned) {
      saveWarned = true;
      toast("Couldn't save: browser storage is unavailable. Changes last until you close this tab.");
    }
  }
  function commit() { save(); render(); }

  function colOf(id) {
    const c = COLS.find(function (col) { return state.columns[col.id].indexOf(id) !== -1; });
    return c ? c.id : null;
  }

  function addCard(col, title) {
    const id = uid();
    state.cards[id] = { id: id, title: title.slice(0, 200), notes: '', due: '' };
    state.columns[col].push(id);
    commit();
    const list = refs[col].list;
    list.scrollTop = list.scrollHeight;
    const hiddenByFilter = filterInput.value.trim() && !matches(state.cards[id], filterInput.value.trim().toLowerCase());
    announce('Added "' + title + '" to ' + COL_NAME[col] + (hiddenByFilter ? '. It is hidden by the current filter.' : '.'));
  }

  function moveCard(id, toCol, beforeId) {
    const from = colOf(id);
    if (!from) return;
    const src = state.columns[from];
    src.splice(src.indexOf(id), 1);
    const target = state.columns[toCol];
    let idx = beforeId ? target.indexOf(beforeId) : -1;
    if (idx < 0) idx = target.length;
    target.splice(idx, 0, id);
    commit();
  }

  function shiftCard(id, delta) {
    const col = colOf(id);
    const arr = state.columns[col];
    const i = arr.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= arr.length) return;
    arr[i] = arr[j];
    arr[j] = id;
    commit();
    announce('Moved "' + state.cards[id].title + '" to position ' + (j + 1) + ' of ' + arr.length + ' in ' + COL_NAME[col] + '.');
    focusCard(id, 'move');
  }

  function moveToColumn(id, col) {
    moveCard(id, col, null);
    announce('Moved "' + state.cards[id].title + '" to ' + COL_NAME[col] + '.');
    if (isMobile()) setActive(col);
    focusCard(id, 'move');
  }

  function dueInfo(due, col) {
    if (!due) return null;
    const parts = due.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((date - today) / 86400000);
    const opts = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
    let label = date.toLocaleDateString(undefined, opts);
    let cls = '';
    if (col !== 'done') {
      if (diff < 0) { cls = 'overdue'; label = 'Overdue · ' + label; }
      else if (diff === 0) { cls = 'soon'; label = 'Due today'; }
      else if (diff === 1) { cls = 'soon'; label = 'Due tomorrow'; }
      else if (diff === 2) { cls = 'soon'; label = 'Due ' + label; }
    }
    return { cls: cls, label: label, full: date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) };
  }

  function matches(card, q) {
    return !q || (card.title + '\n' + card.notes).toLowerCase().indexOf(q) !== -1;
  }

  /* ---------- Build board ---------- */
  const board = $('#board');
  const tabsEl = $('#tabs');
  const filterInput = $('#filter');
  const matchCount = $('#match-count');
  const filterClear = $('#filter-clear');
  const announcer = $('#announcer');
  const refs = {};
  let activeCol = 'todo';
  let dragId = null;
  const line = el('li', 'drop-line');
  line.setAttribute('aria-hidden', 'true');

  document.querySelectorAll('[data-icon]').forEach(function (n) { n.appendChild(icon(n.dataset.icon)); });

  COLS.forEach(function (c) {
    const sec = el('section', 'column');
    sec.id = 'col-' + c.id;
    sec.dataset.col = c.id;
    sec.setAttribute('aria-labelledby', 'h-' + c.id);

    const head = el('div', 'col-head');
    const h = el('h2', null, c.name);
    h.id = 'h-' + c.id;
    h.tabIndex = -1;
    const count = el('span', 'count');
    head.append(h, count);

    const list = el('ul', 'cards');
    list.setAttribute('aria-labelledby', 'h-' + c.id);
    const empty = el('p', 'empty');

    const form = el('form', 'quick-add');
    const lab = el('label', 'sr-only', 'Add a card to ' + c.name + ', press Enter to save');
    lab.htmlFor = 'add-' + c.id;
    const input = el('input');
    input.id = 'add-' + c.id;
    input.type = 'text';
    input.placeholder = '+ Add a card';
    input.maxLength = 200;
    input.autocomplete = 'off';
    input.setAttribute('enterkeyhint', 'done');
    form.append(lab, input);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      addCard(c.id, t);
      input.value = '';
    });

    sec.append(head, list, empty, form);
    board.appendChild(sec);
    setupDrop(sec, list, c.id);

    const tab = el('button', 'tab');
    tab.type = 'button';
    tab.id = 'tab-' + c.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', sec.id);
    const tabCount = el('span', 'count');
    tab.append(el('span', null, c.name), tabCount);
    tab.addEventListener('click', function () { setActive(c.id); });
    tab.addEventListener('dragover', function (e) {
      if (!dragId) return;
      e.preventDefault();
      if (activeCol !== c.id) setActive(c.id);
    });
    tabsEl.appendChild(tab);

    refs[c.id] = { sec: sec, list: list, empty: empty, count: count, tabCount: tabCount, input: input, tab: tab, heading: h };
  });

  tabsEl.addEventListener('keydown', function (e) {
    const i = COLS.findIndex(function (c) { return c.id === activeCol; });
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % COLS.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + COLS.length) % COLS.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = COLS.length - 1;
    if (j === null) return;
    e.preventDefault();
    setActive(COLS[j].id);
    refs[COLS[j].id].tab.focus();
  });

  function setActive(col) {
    activeCol = col;
    COLS.forEach(function (c) {
      const on = c.id === col;
      refs[c.id].sec.classList.toggle('active', on);
      refs[c.id].tab.setAttribute('aria-selected', String(on));
      refs[c.id].tab.tabIndex = on ? 0 : -1;
    });
  }

  function setCount(node, shown, total, filtering) {
    node.textContent = '';
    node.append(filtering ? shown + '/' + total : String(total));
    node.appendChild(el('span', 'sr-only', filtering ? ' cards match' : (total === 1 ? ' card' : ' cards')));
  }

  function buildCard(card, col) {
    const li = el('li', 'card');
    li.dataset.id = card.id;
    li.draggable = true;

    const open = el('button', 'card-open');
    open.type = 'button';
    open.appendChild(el('span', 'card-title', card.title));
    const info = dueInfo(card.due, col);
    const hasNotes = card.notes.trim() !== '';
    if (info || hasNotes) {
      const meta = el('span', 'card-meta');
      if (info) {
        const b = el('span', 'badge' + (info.cls ? ' ' + info.cls : ''));
        b.title = info.full;
        b.append(icon('calendar'), el('span', 'sr-only', 'Due date: '), el('span', null, info.label));
        meta.appendChild(b);
        if (info.cls) li.classList.add('is-' + info.cls);
      }
      if (hasNotes) {
        const n = el('span', 'has-notes');
        n.title = 'Has notes';
        n.append(icon('notes'), el('span', 'sr-only', 'Has notes'));
        meta.appendChild(n);
      }
      open.appendChild(meta);
    }
    open.addEventListener('click', function () { openEditor(card.id); });

    const mv = el('button', 'card-move icon-btn');
    mv.type = 'button';
    mv.title = 'Move to…';
    mv.setAttribute('aria-haspopup', 'menu');
    mv.setAttribute('aria-expanded', 'false');
    mv.setAttribute('aria-label', 'Move "' + card.title + '"');
    mv.appendChild(icon('move'));
    mv.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menuFor === card.id) closeMenu(true); else openMenu(mv, card.id);
    });

    li.append(open, mv);
    li.addEventListener('dragstart', function (e) {
      dragId = card.id;
      closeMenu(false);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', card.title); } catch (err) { /* some browsers restrict setData */ }
      requestAnimationFrame(function () { li.classList.add('dragging'); });
    });
    li.addEventListener('dragend', endDrag);
    return li;
  }

  function findCard(id) {
    return Array.prototype.find.call(board.querySelectorAll('.card'), function (n) { return n.dataset.id === id; }) || null;
  }

  function focusCard(id, which) {
    const li = findCard(id);
    if (li && !li.hidden) {
      li.querySelector(which === 'move' ? '.card-move' : '.card-open').focus();
      li.scrollIntoView({ block: 'nearest' });
    } else {
      const col = colOf(id);
      if (col) refs[col].heading.focus();
    }
  }

  function render() {
    const ae = document.activeElement;
    const focusedLi = ae && ae.closest ? ae.closest('.card') : null;
    const keep = focusedLi ? [focusedLi.dataset.id, ae.classList.contains('card-move') ? 'move' : 'open'] : null;
    const q = filterInput.value.trim().toLowerCase();
    let total = 0;
    let shown = 0;

    COLS.forEach(function (c) {
      const r = refs[c.id];
      const ids = state.columns[c.id];
      let colShown = 0;
      r.list.textContent = '';
      ids.forEach(function (id) {
        const card = state.cards[id];
        const ok = matches(card, q);
        const li = buildCard(card, c.id);
        li.hidden = !ok;
        if (ok) colShown++;
        r.list.appendChild(li);
      });
      total += ids.length;
      shown += colShown;
      setCount(r.count, colShown, ids.length, !!q);
      setCount(r.tabCount, colShown, ids.length, !!q);
      const msg = ids.length === 0 ? 'No cards yet' : (colShown === 0 ? 'No matching cards' : '');
      r.empty.textContent = msg;
      r.empty.hidden = !msg;
    });

    matchCount.textContent = q ? shown + ' of ' + total + (shown === 1 ? ' match' : ' match') : '';
    filterClear.hidden = !filterInput.value;
    if (keep) {
      const li = findCard(keep[0]);
      if (li && !li.hidden) li.querySelector(keep[1] === 'move' ? '.card-move' : '.card-open').focus();
    }
  }

  function announce(msg) {
    announcer.textContent = '';
    setTimeout(function () { announcer.textContent = msg; }, 30);
  }

  /* ---------- Drag and drop ---------- */
  function cardAfter(list, y) {
    const cards = list.querySelectorAll('.card:not(.dragging):not([hidden])');
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return cards[i];
    }
    return null;
  }

  function setupDrop(sec, list, col) {
    sec.addEventListener('dragover', function (e) {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      sec.classList.add('drag-over');
      const after = cardAfter(list, e.clientY);
      if (line.parentNode !== list || line.nextElementSibling !== after) list.insertBefore(line, after);
    });
    sec.addEventListener('dragleave', function (e) {
      if (sec.contains(e.relatedTarget)) return;
      sec.classList.remove('drag-over');
      if (line.parentNode === list) line.remove();
    });
    sec.addEventListener('drop', function (e) {
      if (!dragId) return;
      e.preventDefault();
      const next = line.parentNode === list ? line.nextElementSibling : null;
      const beforeId = next && next.dataset.id ? next.dataset.id : null;
      const id = dragId;
      const from = colOf(id);
      endDrag();
      moveCard(id, col, beforeId);
      announce(from === col ? 'Reordered "' + state.cards[id].title + '".' : 'Moved "' + state.cards[id].title + '" to ' + COL_NAME[col] + '.');
    });
  }

  function endDrag() {
    dragId = null;
    line.remove();
    board.querySelectorAll('.dragging').forEach(function (n) { n.classList.remove('dragging'); });
    board.querySelectorAll('.drag-over').forEach(function (n) { n.classList.remove('drag-over'); });
  }

  /* ---------- Move menu ---------- */
  const menu = $('#move-menu');
  let menuFor = null;
  let menuBtn = null;

  function openMenu(btn, id) {
    closeMenu(false);
    const col = colOf(id);
    const arr = state.columns[col];
    const i = arr.indexOf(id);
    const items = [];
    COLS.forEach(function (c) {
      if (c.id !== col) items.push(['Move to ' + c.name, function () { moveToColumn(id, c.id); }]);
    });
    if (i > 0) items.push(['Move up', function () { shiftCard(id, -1); }]);
    if (i < arr.length - 1) items.push(['Move down', function () { shiftCard(id, 1); }]);

    menu.textContent = '';
    items.forEach(function (item) {
      const b = el('button', 'menu-item', item[0]);
      b.type = 'button';
      b.tabIndex = -1;
      b.setAttribute('role', 'menuitem');
      b.addEventListener('click', function () { closeMenu(false); item[1](); });
      menu.appendChild(b);
    });
    menu.setAttribute('aria-label', 'Move "' + state.cards[id].title + '"');
    menu.hidden = false;
    menuFor = id;
    menuBtn = btn;
    btn.setAttribute('aria-expanded', 'true');

    const r = btn.getBoundingClientRect();
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    let top = r.bottom + 4;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    const left = Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8));
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.firstElementChild.focus();
  }

  function closeMenu(refocus) {
    if (menu.hidden) return;
    menu.hidden = true;
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      if (refocus && menuBtn.isConnected) menuBtn.focus();
    }
    menuFor = null;
    menuBtn = null;
  }

  menu.addEventListener('keydown', function (e) {
    const items = Array.prototype.slice.call(menu.children);
    const i = items.indexOf(document.activeElement);
    let j = null;
    if (e.key === 'ArrowDown') j = (i + 1) % items.length;
    else if (e.key === 'ArrowUp') j = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = items.length - 1;
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(true); return; }
    if (j === null) return;
    e.preventDefault();
    items[j].focus();
  });
  document.addEventListener('pointerdown', function (e) {
    if (menu.hidden || menu.contains(e.target) || (menuBtn && menuBtn.contains(e.target))) return;
    closeMenu(false);
  });
  window.addEventListener('resize', function () { closeMenu(false); });
  document.addEventListener('scroll', function (e) { if (!menu.contains(e.target)) closeMenu(false); }, true);

  /* ---------- Editor ---------- */
  const editor = $('#editor');
  const form = $('#editor-form');
  const fTitle = $('#f-title');
  const fNotes = $('#f-notes');
  const fDue = $('#f-due');
  const fCol = $('#f-col');
  const titleErr = $('#f-title-error');
  const actionsRow = $('#editor-actions');
  const confirmBox = $('#confirm-delete');
  const deleteBtn = $('#delete-btn');
  let editingId = null;
  let returnCol = null;

  COLS.forEach(function (c) {
    const o = el('option', null, c.name);
    o.value = c.id;
    fCol.appendChild(o);
  });

  function setTitleError(on) {
    titleErr.hidden = !on;
    fTitle.setAttribute('aria-invalid', String(on));
  }
  function showConfirm(on) {
    confirmBox.hidden = !on;
    actionsRow.hidden = on;
  }

  function openEditor(id) {
    const card = state.cards[id];
    if (!card) return;
    closeMenu(false);
    editingId = id;
    returnCol = colOf(id);
    fTitle.value = card.title;
    fNotes.value = card.notes;
    fDue.value = card.due;
    fCol.value = returnCol;
    setTitleError(false);
    showConfirm(false);
    editor.showModal();
    fTitle.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const card = state.cards[editingId];
    if (!card) { editor.close(); return; }
    const t = fTitle.value.trim();
    if (!t) { setTitleError(true); fTitle.focus(); return; }
    card.title = t.slice(0, 200);
    card.notes = fNotes.value.slice(0, 5000);
    card.due = /^\d{4}-\d{2}-\d{2}$/.test(fDue.value) ? fDue.value : '';
    const target = fCol.value;
    if (target !== colOf(editingId)) moveCard(editingId, target, null); else commit();
    announce('Saved "' + card.title + '".');
    editor.close();
  });
  fNotes.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); }
  });
  fTitle.addEventListener('input', function () { if (fTitle.value.trim()) setTitleError(false); });

  editor.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { editor.close(); });
  });
  editor.addEventListener('click', function (e) { if (e.target === editor) editor.close(); });
  editor.addEventListener('close', function () {
    const id = editingId;
    editingId = null;
    if (id && state.cards[id]) {
      const col = colOf(id);
      if (isMobile()) setActive(col);
      focusCard(id, 'open');
    } else if (returnCol) {
      refs[returnCol].input.focus();
    }
  });

  deleteBtn.addEventListener('click', function () {
    showConfirm(true);
    $('#confirm-delete-btn').focus();
  });
  $('#keep-btn').addEventListener('click', function () {
    showConfirm(false);
    deleteBtn.focus();
  });
  $('#confirm-delete-btn').addEventListener('click', function () {
    const id = editingId;
    const col = colOf(id);
    if (!col) { editor.close(); return; }
    const title = state.cards[id].title;
    state.columns[col].splice(state.columns[col].indexOf(id), 1);
    delete state.cards[id];
    returnCol = col;
    commit();
    announce('Deleted "' + title + '".');
    editor.close();
  });

  /* ---------- Filter ---------- */
  filterInput.addEventListener('input', render);
  filterInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && filterInput.value) { e.preventDefault(); filterInput.value = ''; render(); }
  });
  filterClear.addEventListener('click', function () {
    filterInput.value = '';
    render();
    filterInput.focus();
  });

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const themeBtn = $('#theme-btn');
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = store.get(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') root.dataset.theme = savedTheme;

  function currentTheme() { return root.dataset.theme || (mq.matches ? 'dark' : 'light'); }
  function updateThemeBtn() {
    const dark = currentTheme() === 'dark';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    themeBtn.textContent = '';
    themeBtn.appendChild(icon(dark ? 'sun' : 'moon'));
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
  }
  themeBtn.addEventListener('click', function () {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set(THEME_KEY, next);
    updateThemeBtn();
  });
  if (mq.addEventListener) mq.addEventListener('change', updateThemeBtn);

  /* ---------- Toast, export, import ---------- */
  const toastEl = $('#toast');
  const toastMsg = $('#toast-msg');
  const toastUndo = $('#toast-undo');
  let toastTimer = null;
  let undoFn = null;

  function toast(msg, undo) {
    toastMsg.textContent = msg;
    undoFn = undo || null;
    toastUndo.hidden = !undo;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; undoFn = null; }, undo ? 9000 : 4500);
  }
  toastUndo.addEventListener('click', function () {
    const f = undoFn;
    undoFn = null;
    toastEl.hidden = true;
    if (f) f();
  });

  $('#export-btn').addEventListener('click', function () {
    const payload = { app: 'Laneboard', version: 1, exportedAt: new Date().toISOString(), cards: state.cards, columns: state.columns };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'laneboard-' + todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Board exported.');
  });

  const importFile = $('#import-file');
  $('#import-btn').addEventListener('click', function () { importFile.click(); });
  importFile.addEventListener('change', function () {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      importFile.value = '';
      let data = null;
      try { data = normalize(JSON.parse(String(reader.result))); } catch (e) { data = null; }
      if (!data) { toast("That file isn't a Laneboard export."); return; }
      const prev = state;
      state = data;
      commit();
      const n = Object.keys(data.cards).length;
      toast('Imported ' + n + (n === 1 ? ' card.' : ' cards.'), function () {
        state = prev;
        commit();
        toast('Import undone.');
      });
    };
    reader.onerror = function () { importFile.value = ''; toast("Couldn't read that file."); };
    reader.readAsText(file);
  });

  /* ---------- Sync and refresh ---------- */
  window.addEventListener('storage', function (e) {
    if (e.key === DATA_KEY) { state = load(); render(); }
  });
  // Due-date colours depend on today's date, so refresh when the tab comes back.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') render();
  });

  updateThemeBtn();
  setActive('todo');
  render();
})();
