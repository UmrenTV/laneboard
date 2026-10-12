(function () {
  'use strict';

  const COLS = [
    { id: 'todo', name: 'To do' },
    { id: 'doing', name: 'Doing' },
    { id: 'done', name: 'Done' }
  ];
  const COL_NAME = {};
  COLS.forEach(function (c) { COL_NAME[c.id] = c.name; });
  const LABELS = [
    { id: 'red', name: 'Red', color: '#e5484d' },
    { id: 'orange', name: 'Orange', color: '#f76b15' },
    { id: 'yellow', name: 'Yellow', color: '#ffc53d' },
    { id: 'green', name: 'Green', color: '#30a46c' },
    { id: 'blue', name: 'Blue', color: '#0090ff' },
    { id: 'purple', name: 'Purple', color: '#8e4ec6' }
  ];
  const LABEL_BY_ID = {};
  LABELS.forEach(function (l) { LABEL_BY_ID[l.id] = l; });
  const SCHEMA = 2;
  const DATA_KEY = 'laneboard.v1';
  const THEME_KEY = 'laneboard.theme';
  const SETTINGS_KEY = 'laneboard.settings';
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
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    party: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6',
    help: 'M12 21a9 9 0 1 0 0-18a9 9 0 1 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
    check: 'M5 12l5 5 9-10',
    checklist: 'M4 6l2 2 3-3M4 14l2 2 3-3M12 7h8M12 15h8',
    trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13'
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
  function safeKey(k) { return k !== '__proto__' && k !== 'constructor' && k !== 'prototype'; }
  const isMobile = function () { return window.matchMedia('(max-width: 719px)').matches; };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Data ---------- */
  function emptyState() { return { schemaVersion: SCHEMA, cards: {}, columns: { todo: [], doing: [], done: [] } }; }

  function cleanLabels(list) {
    if (!Array.isArray(list)) return [];
    return LABELS.map(function (l) { return l.id; }).filter(function (id) { return list.indexOf(id) !== -1; });
  }
  function cleanChecklist(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    const ids = new Set();
    list.forEach(function (it) {
      if (!it || typeof it !== 'object' || typeof it.text !== 'string' || !it.text.trim() || out.length >= 100) return;
      const id = typeof it.id === 'string' && it.id && !ids.has(it.id) ? it.id : uid();
      ids.add(id);
      out.push({ id: id, text: it.text.trim().slice(0, 200), done: it.done === true });
    });
    return out;
  }

  // Accepts v1 (unversioned) and v2 data. Unknown fields are kept; v1 cards gain the new fields.
  function normalize(data) {
    if (!data || typeof data !== 'object' || !data.cards || typeof data.cards !== 'object' ||
        !data.columns || typeof data.columns !== 'object') return null;
    const now = Date.now();
    const out = emptyState();
    Object.keys(data).forEach(function (k) {
      if (safeKey(k) && !(k in out) && ['app', 'version', 'exportedAt', 'settings'].indexOf(k) === -1) out[k] = data[k];
    });
    const seen = new Set();
    const own = function (id) { return safeKey(id) && Object.prototype.hasOwnProperty.call(data.cards, id); };
    const clean = function (raw, id, col) {
      if (!raw || typeof raw !== 'object' || typeof raw.title !== 'string' || !raw.title.trim()) return null;
      const card = {};
      Object.keys(raw).forEach(function (k) { if (safeKey(k)) card[k] = raw[k]; });
      card.id = id;
      card.title = raw.title.trim().slice(0, 200);
      card.notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 5000) : '';
      card.due = typeof raw.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.due) ? raw.due : '';
      card.labels = cleanLabels(raw.labels);
      card.checklist = cleanChecklist(raw.checklist);
      const at = typeof raw.completedAt === 'number' && isFinite(raw.completedAt) ? raw.completedAt : null;
      delete card.completedLegacy;
      if (col !== 'done') card.completedAt = null;
      else if (at === null) { card.completedAt = now; card.completedLegacy = true; }
      else { card.completedAt = at; if (raw.completedLegacy === true) card.completedLegacy = true; }
      return card;
    };
    const place = function (id, col) {
      if (typeof id !== 'string' || seen.has(id) || !own(id)) return;
      const card = clean(data.cards[id], id, col);
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
    try {
      const parsed = JSON.parse(raw);
      const data = normalize(parsed);
      if (!data) return emptyState();
      if (parsed.schemaVersion !== SCHEMA) store.set(DATA_KEY, JSON.stringify(data));
      return data;
    } catch (e) { return emptyState(); }
  }

  function defaultSettings() {
    const names = {};
    LABELS.forEach(function (l) { names[l.id] = ''; });
    return { wipLimit: null, celebrate: true, labelNames: names };
  }
  function cleanSettings(raw) {
    const s = defaultSettings();
    if (!raw || typeof raw !== 'object') return s;
    if (Number.isInteger(raw.wipLimit) && raw.wipLimit >= 1 && raw.wipLimit <= 99) s.wipLimit = raw.wipLimit;
    if (raw.celebrate === false) s.celebrate = false;
    if (raw.labelNames && typeof raw.labelNames === 'object') {
      LABELS.forEach(function (l) {
        const v = raw.labelNames[l.id];
        if (typeof v === 'string') s.labelNames[l.id] = v.trim().slice(0, 30);
      });
    }
    return s;
  }
  function loadSettings() {
    try { return cleanSettings(JSON.parse(store.get(SETTINGS_KEY) || 'null')); } catch (e) { return defaultSettings(); }
  }
  function saveSettings() { store.set(SETTINGS_KEY, JSON.stringify(settings)); }
  function labelName(id) { return settings.labelNames[id] || LABEL_BY_ID[id].name; }

  let state = load();
  let settings = loadSettings();
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

  function weekStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }
  function doneThisWeek() {
    const start = weekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return state.columns.done.filter(function (id) {
      const c = state.cards[id];
      return c.completedAt && !c.completedLegacy && c.completedAt >= start.getTime() && c.completedAt < end.getTime();
    }).length;
  }

  function addCard(col, title) {
    const id = uid();
    state.cards[id] = { id: id, title: title.slice(0, 200), notes: '', due: '', labels: [], checklist: [], completedAt: col === 'done' ? Date.now() : null };
    state.columns[col].push(id);
    commit();
    const list = refs[col].list;
    list.scrollTop = list.scrollHeight;
    const hiddenByFilter = filterInput.value.trim() && !matches(state.cards[id], filterInput.value.trim().toLowerCase());
    announce('Added "' + title + '" to ' + COL_NAME[col] + (hiddenByFilter ? '. It is hidden by the current filter.' : '.'));
  }

  // Every move path (drag, menu, shortcut, editor) goes through here.
  function moveCard(id, toCol, beforeId, opts) {
    opts = opts || {};
    const from = colOf(id);
    if (!from) return;
    const card = state.cards[id];
    const src = state.columns[from];
    const snap = { id: id, from: from, fromIndex: src.indexOf(id), completedAt: card.completedAt, legacy: card.completedLegacy === true };
    src.splice(snap.fromIndex, 1);
    const target = state.columns[toCol];
    let idx = beforeId ? target.indexOf(beforeId) : -1;
    if (idx < 0) idx = target.length;
    target.splice(idx, 0, id);
    const entered = toCol === 'done' && from !== 'done';
    if (entered) { card.completedAt = Date.now(); delete card.completedLegacy; }
    else if (toCol !== 'done') { card.completedAt = null; delete card.completedLegacy; }
    commit();
    if (from !== toCol) {
      toast('Moved "' + card.title + '" to ' + COL_NAME[toCol] + '.', function () { restoreMove(snap); });
    }
    if (entered) celebrate(id);
  }

  function restoreMove(s) {
    const card = state.cards[s.id];
    const cur = colOf(s.id);
    if (!card || !cur) return;
    state.columns[cur].splice(state.columns[cur].indexOf(s.id), 1);
    const arr = state.columns[s.from];
    arr.splice(Math.min(s.fromIndex, arr.length), 0, s.id);
    card.completedAt = s.completedAt;
    if (s.legacy) card.completedLegacy = true; else delete card.completedLegacy;
    commit();
    if (isMobile()) setActive(s.from);
    announce('Move undone. "' + card.title + '" is back in ' + COL_NAME[s.from] + '.');
    focusCard(s.id, 'open');
  }

  function shiftCard(id, delta, which) {
    const col = colOf(id);
    const arr = state.columns[col];
    const i = arr.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= arr.length) return;
    arr[i] = arr[j];
    arr[j] = id;
    commit();
    announce('Moved "' + state.cards[id].title + '" to position ' + (j + 1) + ' of ' + arr.length + ' in ' + COL_NAME[col] + '.');
    focusCard(id, which || 'move');
  }

  function moveToColumn(id, col, which) {
    moveCard(id, col, null);
    if (isMobile()) setActive(col);
    focusCard(id, which || 'move');
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
    if (!q) return true;
    const parts = [card.title, card.notes]
      .concat(card.labels.map(function (id) { return settings.labelNames[id] || ''; }))
      .concat(card.checklist.map(function (it) { return it.text; }));
    return parts.join('\n').toLowerCase().indexOf(q) !== -1;
  }

  /* ---------- Build board ---------- */
  const board = $('#board');
  const tabsEl = $('#tabs');
  const filterInput = $('#filter');
  const matchCount = $('#match-count');
  const filterClear = $('#filter-clear');
  const announcer = $('#announcer');
  const weekChip = $('#week-chip');
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
    let count;
    if (c.id === 'doing') {
      count = el('button', 'count count-btn');
      count.type = 'button';
      count.title = 'Set a WIP limit';
      count.setAttribute('aria-haspopup', 'dialog');
      count.setAttribute('aria-expanded', 'false');
      count.addEventListener('click', function () { if (wipPop.hidden) openWip(); else closeWip(true); });
    } else {
      count = el('span', 'count');
    }
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

  function setCount(node, shown, total, filtering, limit, isBtn) {
    const over = limit != null && total > limit;
    node.textContent = '';
    node.append(filtering ? shown + '/' + total : (limit != null ? total + ' / ' + limit : String(total)));
    let sr = filtering ? ' cards match' : (total === 1 ? ' card' : ' cards');
    if (limit != null) sr += ', WIP limit ' + limit + (over ? ', over the limit' : '');
    if (isBtn) sr += '. Set WIP limit';
    node.appendChild(el('span', 'sr-only', sr));
    node.classList.toggle('over', over);
  }

  function buildCard(card, col) {
    const li = el('li', 'card');
    li.dataset.id = card.id;
    li.draggable = true;

    const open = el('button', 'card-open');
    open.type = 'button';
    if (card.labels.length) {
      const names = card.labels.map(labelName);
      const dots = el('span', 'card-labels');
      dots.title = names.join(', ');
      card.labels.forEach(function (id) {
        const d = el('span', 'label-dot');
        d.style.background = LABEL_BY_ID[id].color;
        dots.appendChild(d);
      });
      dots.appendChild(el('span', 'sr-only', 'Labels: ' + names.join(', ') + '. '));
      open.appendChild(dots);
    }
    open.appendChild(el('span', 'card-title', card.title));
    const info = dueInfo(card.due, col);
    const hasNotes = card.notes.trim() !== '';
    const total = card.checklist.length;
    const doneItems = card.checklist.filter(function (i) { return i.done; }).length;
    if (info || hasNotes || total) {
      const meta = el('span', 'card-meta');
      if (info) {
        const b = el('span', 'badge' + (info.cls ? ' ' + info.cls : ''));
        b.title = info.full;
        b.append(icon('calendar'), el('span', 'sr-only', 'Due date: '), el('span', null, info.label));
        meta.appendChild(b);
        if (info.cls) li.classList.add('is-' + info.cls);
      }
      if (total) {
        const b = el('span', 'badge' + (doneItems === total ? ' all-done' : ''));
        b.title = doneItems + ' of ' + total + ' checklist items done';
        b.append(icon('checklist'), el('span', 'sr-only', 'Checklist: '), el('span', null, doneItems + '/' + total));
        meta.appendChild(b);
      }
      if (hasNotes) {
        const n = el('span', 'has-notes');
        n.title = 'Has notes';
        n.append(icon('notes'), el('span', 'sr-only', 'Has notes'));
        meta.appendChild(n);
      }
      open.appendChild(meta);
    }
    if (total) {
      const bar = el('span', 'progress' + (doneItems === total ? ' full' : ''));
      bar.setAttribute('aria-hidden', 'true');
      const fill = el('span');
      fill.style.width = Math.round(doneItems / total * 100) + '%';
      bar.appendChild(fill);
      open.appendChild(bar);
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
      const limit = c.id === 'doing' ? settings.wipLimit : null;
      setCount(r.count, colShown, ids.length, !!q, limit, c.id === 'doing');
      setCount(r.tabCount, colShown, ids.length, !!q, limit, false);
      const msg = ids.length === 0 ? 'No cards yet' : (colShown === 0 ? 'No matching cards' : '');
      r.empty.textContent = msg;
      r.empty.hidden = !msg;
    });

    matchCount.textContent = q ? shown + ' of ' + total + ' match' : '';
    filterClear.hidden = !filterInput.value;
    weekChip.textContent = '';
    weekChip.append(icon('check'), el('span', null, 'Done this week: ' + doneThisWeek()));
    if (keep) {
      const li = findCard(keep[0]);
      if (li && !li.hidden) li.querySelector(keep[1] === 'move' ? '.card-move' : '.card-open').focus();
    }
  }

  function announce(msg) {
    announcer.textContent = '';
    setTimeout(function () { announcer.textContent = msg; }, 30);
  }

  /* ---------- Celebration ---------- */
  function celebrate(id) {
    if (!settings.celebrate || reduceMotion.matches) return;
    requestAnimationFrame(function () {
      const li = findCard(id);
      const visible = li && !li.hidden && li.getClientRects().length > 0;
      const r = visible ? li.getBoundingClientRect() : (isMobile() ? refs.done.tab : refs.done.heading).getBoundingClientRect();
      if (visible) li.classList.add('bounce');
      burst(r.left + r.width / 2, r.top + Math.min(r.height / 2, 40));
    });
  }
  function burst(x, y) {
    const box = el('div', 'confetti');
    box.setAttribute('aria-hidden', 'true');
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    for (let i = 0; i < 28; i++) {
      const p = el('span', 'confetti-piece');
      const a = Math.random() * Math.PI * 2;
      const d = 50 + Math.random() * 90;
      p.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px');
      p.style.setProperty('--dy', Math.round(Math.sin(a) * d - 40) + 'px');
      p.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
      p.style.background = LABELS[i % LABELS.length].color;
      p.style.animationDelay = Math.round(Math.random() * 80) + 'ms';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 1200);
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
      if (from === col) announce('Reordered "' + state.cards[id].title + '".');
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
    closeWip(false);
    const col = colOf(id);
    const arr = state.columns[col];
    const i = arr.indexOf(id);
    const items = [];
    COLS.forEach(function (c) {
      if (c.id !== col) items.push(['Move to ' + c.name, function () { moveToColumn(id, c.id, 'move'); }]);
    });
    if (i > 0) items.push(['Move up', function () { shiftCard(id, -1, 'move'); }]);
    if (i < arr.length - 1) items.push(['Move down', function () { shiftCard(id, 1, 'move'); }]);

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
  window.addEventListener('resize', function () { closeMenu(false); if (!wipPop.hidden) placeWip(); });
  document.addEventListener('scroll', function (e) { if (!menu.contains(e.target)) closeMenu(false); }, true);

  /* ---------- WIP popover ---------- */
  const wipPop = $('#wip-pop');
  const wipForm = $('#wip-form');
  const wipInput = $('#wip-input');
  const wipError = $('#wip-error');
  const wipBtn = refs.doing.count;

  function placeWip() {
    const r = wipBtn.getBoundingClientRect();
    const w = wipPop.offsetWidth;
    const left = Math.max(8, Math.min(r.right - w, document.documentElement.clientWidth - w - 8));
    wipPop.style.top = (r.bottom + window.scrollY + 6) + 'px';
    wipPop.style.left = (left + window.scrollX) + 'px';
  }
  function openWip() {
    closeMenu(false);
    wipInput.value = settings.wipLimit != null ? String(settings.wipLimit) : '';
    wipError.hidden = true;
    wipInput.removeAttribute('aria-invalid');
    wipPop.hidden = false;
    wipBtn.setAttribute('aria-expanded', 'true');
    placeWip();
    wipInput.focus();
    wipInput.select();
  }
  function closeWip(refocus) {
    if (wipPop.hidden) return;
    wipPop.hidden = true;
    wipBtn.setAttribute('aria-expanded', 'false');
    if (refocus) wipBtn.focus();
  }
  function setWip(limit) {
    settings.wipLimit = limit;
    saveSettings();
    render();
    closeWip(true);
    announce(limit == null ? 'WIP limit for Doing turned off.' : 'WIP limit for Doing set to ' + limit + '.');
  }
  wipForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const v = wipInput.value.trim();
    if (!v) { setWip(null); return; }
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 99) {
      wipError.hidden = false;
      wipInput.setAttribute('aria-invalid', 'true');
      wipInput.focus();
      return;
    }
    setWip(n);
  });
  $('#wip-clear').addEventListener('click', function () { setWip(null); });
  wipPop.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeWip(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!menu.hidden && !menu.contains(e.target) && !(menuBtn && menuBtn.contains(e.target))) closeMenu(false);
    if (!wipPop.hidden && !wipPop.contains(e.target) && !wipBtn.contains(e.target)) closeWip(false);
  });

  /* ---------- Editor ---------- */
  const editor = $('#editor');
  const form = $('#editor-form');
  const fTitle = $('#f-title');
  const fNotes = $('#f-notes');
  const fDue = $('#f-due');
  const fCol = $('#f-col');
  const fMore = $('#f-more');
  const moreHint = $('#more-hint');
  const chipsEl = $('#f-labels');
  const renameBtn = $('#rename-btn');
  const renameBox = $('#rename-box');
  const checklistEl = $('#f-checklist');
  const addItem = $('#f-add-item');
  const checkCount = $('#f-check-count');
  const titleErr = $('#f-title-error');
  const actionsRow = $('#editor-actions');
  const confirmBox = $('#confirm-delete');
  const deleteBtn = $('#delete-btn');
  const chipRefs = {};
  let editingId = null;
  let returnCol = null;
  let draft = null;

  COLS.forEach(function (c) {
    const o = el('option', null, c.name);
    o.value = c.id;
    fCol.appendChild(o);
  });

  LABELS.forEach(function (l) {
    const b = el('button', 'chip');
    b.type = 'button';
    const sw = el('span', 'chip-swatch');
    sw.style.background = l.color;
    const txt = el('span');
    b.append(sw, txt, icon('check'));
    b.addEventListener('click', function () {
      const i = draft.labels.indexOf(l.id);
      if (i === -1) draft.labels.push(l.id); else draft.labels.splice(i, 1);
      draft.labels = cleanLabels(draft.labels);
      updateChips();
    });
    chipsEl.appendChild(b);

    const wrap = el('div', 'rename-field');
    const lab = el('label');
    lab.htmlFor = 'ln-' + l.id;
    const labText = el('span', 'lab');
    const sw2 = el('span', 'chip-swatch');
    sw2.style.background = l.color;
    labText.append(sw2, l.name + ' label name');
    lab.appendChild(labText);
    const inp = el('input');
    inp.id = 'ln-' + l.id;
    inp.type = 'text';
    inp.maxLength = 30;
    inp.placeholder = l.name;
    inp.autocomplete = 'off';
    inp.addEventListener('input', function () {
      settings.labelNames[l.id] = inp.value.trim().slice(0, 30);
      saveSettings();
      updateChips();
      render();
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    wrap.append(lab, inp);
    renameBox.appendChild(wrap);
    chipRefs[l.id] = { btn: b, txt: txt, input: inp };
  });

  renameBtn.addEventListener('click', function () {
    const open = renameBox.hidden;
    renameBox.hidden = !open;
    renameBtn.setAttribute('aria-expanded', String(open));
    if (open) chipRefs[LABELS[0].id].input.focus();
  });

  function updateMoreHint() {
    const bits = [];
    if (draft.labels.length) bits.push(draft.labels.length + (draft.labels.length === 1 ? ' label' : ' labels'));
    const total = draft.checklist.length;
    if (total) bits.push(draft.checklist.filter(function (i) { return i.done; }).length + '/' + total + ' done');
    moreHint.textContent = bits.length ? '· ' + bits.join(' · ') : 'Labels and checklist';
  }
  function updateChips() {
    LABELS.forEach(function (l) {
      const r = chipRefs[l.id];
      const name = labelName(l.id);
      r.btn.setAttribute('aria-pressed', String(draft.labels.indexOf(l.id) !== -1));
      r.btn.setAttribute('aria-label', name + (settings.labelNames[l.id] ? ' (' + l.name + ')' : '') + ' label');
      r.txt.textContent = name;
    });
    updateMoreHint();
  }
  function updateCheckCount() {
    const total = draft.checklist.length;
    checkCount.textContent = total ? '(' + draft.checklist.filter(function (i) { return i.done; }).length + '/' + total + ')' : '';
    updateMoreHint();
  }

  function renderChecklist() {
    checklistEl.textContent = '';
    draft.checklist.forEach(function (item, i) {
      const row = el('li', 'check-row' + (item.done ? ' done' : ''));
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = item.done;
      cb.setAttribute('aria-label', 'Done: ' + item.text);
      cb.addEventListener('change', function () {
        item.done = cb.checked;
        row.classList.toggle('done', cb.checked);
        updateCheckCount();
      });
      const txt = el('input', 'check-text');
      txt.type = 'text';
      txt.value = item.text;
      txt.maxLength = 200;
      txt.setAttribute('aria-label', 'Checklist item ' + (i + 1));
      txt.addEventListener('input', function () {
        item.text = txt.value;
        cb.setAttribute('aria-label', 'Done: ' + txt.value);
      });
      txt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addItem.focus(); }
      });
      const del = el('button', 'icon-btn check-del');
      del.type = 'button';
      del.title = 'Delete item';
      del.setAttribute('aria-label', 'Delete checklist item ' + (i + 1));
      del.appendChild(icon('trash'));
      del.addEventListener('click', function () {
        draft.checklist.splice(draft.checklist.indexOf(item), 1);
        renderChecklist();
        const rows = checklistEl.querySelectorAll('.check-text');
        (rows[Math.min(i, rows.length - 1)] || addItem).focus();
      });
      row.append(cb, txt, del);
      checklistEl.appendChild(row);
    });
    updateCheckCount();
  }

  addItem.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const t = addItem.value.trim();
    if (!t || draft.checklist.length >= 100) return;
    draft.checklist.push({ id: uid(), text: t.slice(0, 200), done: false });
    addItem.value = '';
    renderChecklist();
    announce('Added checklist item "' + t + '".');
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
    closeWip(false);
    editingId = id;
    returnCol = colOf(id);
    fTitle.value = card.title;
    fNotes.value = card.notes;
    fDue.value = card.due;
    fCol.value = returnCol;
    draft = {
      labels: card.labels.slice(),
      checklist: card.checklist.map(function (i) { return { id: i.id, text: i.text, done: i.done }; })
    };
    fMore.open = draft.labels.length > 0 || draft.checklist.length > 0;
    renameBox.hidden = true;
    renameBtn.setAttribute('aria-expanded', 'false');
    LABELS.forEach(function (l) { chipRefs[l.id].input.value = settings.labelNames[l.id]; });
    addItem.value = '';
    updateChips();
    renderChecklist();
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
    card.labels = cleanLabels(draft.labels);
    card.checklist = cleanChecklist(draft.checklist);
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
    const copy = JSON.parse(JSON.stringify(state.cards[id]));
    const index = state.columns[col].indexOf(id);
    state.columns[col].splice(index, 1);
    delete state.cards[id];
    returnCol = col;
    commit();
    editor.close();
    toast('Deleted "' + copy.title + '".', function () { restoreDeleted(copy, col, index); });
  });

  function restoreDeleted(card, col, index) {
    if (state.cards[card.id]) return;
    state.cards[card.id] = card;
    const arr = state.columns[col];
    arr.splice(Math.min(index, arr.length), 0, card.id);
    commit();
    if (isMobile()) setActive(col);
    announce('Restored "' + card.title + '".');
    focusCard(card.id, 'open');
  }

  /* ---------- Help overlay ---------- */
  const help = $('#help');
  const helpBtn = $('#help-btn');
  let helpReturn = null;

  function openHelp() {
    if (help.open || editor.open) return;
    closeMenu(false);
    closeWip(false);
    helpReturn = document.activeElement;
    help.showModal();
    $('#help-close').focus();
  }
  helpBtn.addEventListener('click', openHelp);
  $('#help-close').addEventListener('click', function () { help.close(); });
  help.addEventListener('click', function (e) { if (e.target === help) help.close(); });
  help.addEventListener('close', function () {
    if (helpReturn && helpReturn.isConnected && typeof helpReturn.focus === 'function') helpReturn.focus();
    helpReturn = null;
  });

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  const toastMsg = $('#toast-msg');
  const toastUndo = $('#toast-undo');
  let toastTimer = null;
  let undoFn = null;

  function hideToast() {
    clearTimeout(toastTimer);
    toastTimer = null;
    toastEl.hidden = true;
    undoFn = null;
  }
  function toast(msg, undo) {
    clearTimeout(toastTimer);
    toastMsg.textContent = msg;
    undoFn = typeof undo === 'function' ? undo : null;
    toastUndo.hidden = !undoFn;
    toastEl.hidden = false;
    toastTimer = setTimeout(hideToast, undoFn ? 7000 : 4000);
  }
  toastUndo.addEventListener('click', function () {
    const fn = undoFn;
    hideToast();
    if (fn) fn();
  });
  toastEl.addEventListener('focusin', function () { clearTimeout(toastTimer); });
  toastEl.addEventListener('focusout', function () {
    if (!toastEl.hidden) toastTimer = setTimeout(hideToast, 4000);
  });

  /* ---------- Theme ---------- */
  const themeBtn = $('#theme-btn');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;

  function currentTheme() {
    const t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return darkQuery.matches ? 'dark' : 'light';
  }
  function updateThemeBtn() {
    const dark = currentTheme() === 'dark';
    themeBtn.textContent = '';
    themeBtn.appendChild(icon(dark ? 'sun' : 'moon'));
    themeBtn.setAttribute('aria-label', 'Dark mode');
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }
  const savedTheme = store.get(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') root.setAttribute('data-theme', savedTheme);
  themeBtn.addEventListener('click', function () {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set(THEME_KEY, next);
    updateThemeBtn();
  });
  try { darkQuery.addEventListener('change', updateThemeBtn); }
  catch (e) { if (darkQuery.addListener) darkQuery.addListener(updateThemeBtn); }

  /* ---------- Celebrations toggle ---------- */
  const celebrateBtn = $('#celebrate-btn');
  function updateCelebrateBtn() {
    celebrateBtn.setAttribute('aria-pressed', String(settings.celebrate));
    celebrateBtn.title = settings.celebrate ? 'Celebrations on' : 'Celebrations off';
  }
  celebrateBtn.addEventListener('click', function () {
    settings.celebrate = !settings.celebrate;
    saveSettings();
    updateCelebrateBtn();
    announce(settings.celebrate ? 'Celebrations turned on.' : 'Celebrations turned off.');
  });

  /* ---------- Export / import ---------- */
  $('#export-btn').addEventListener('click', function () {
    const data = Object.assign({ app: 'laneboard', exportedAt: new Date().toISOString() }, state, { settings: settings });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'laneboard-' + todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    const n = Object.keys(state.cards).length;
    toast('Exported ' + n + (n === 1 ? ' card.' : ' cards.'));
  });

  const importFile = $('#import-file');
  $('#import-btn').addEventListener('click', function () {
    importFile.value = '';
    importFile.click();
  });
  importFile.addEventListener('change', function () {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      let parsed;
      try { parsed = JSON.parse(String(reader.result)); }
      catch (e) { toast("Couldn't import: that file isn't valid JSON."); return; }
      const data = normalize(parsed);
      if (!data) { toast("Couldn't import: that file isn't a Laneboard board."); return; }
      const prevState = JSON.stringify(state);
      const prevSettings = JSON.stringify(settings);
      closeMenu(false);
      closeWip(false);
      state = data;
      if (parsed.settings && typeof parsed.settings === 'object') {
        settings = cleanSettings(parsed.settings);
        saveSettings();
        updateCelebrateBtn();
      }
      commit();
      const n = Object.keys(state.cards).length;
      toast('Imported ' + n + (n === 1 ? ' card.' : ' cards.'), function () {
        state = JSON.parse(prevState);
        settings = cleanSettings(JSON.parse(prevSettings));
        saveSettings();
        updateCelebrateBtn();
        commit();
        announce('Import undone.');
      });
    };
    reader.onerror = function () { toast("Couldn't read that file."); };
    reader.readAsText(file);
  });

  /* ---------- Filter ---------- */
  filterInput.addEventListener('input', render);
  filterInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && filterInput.value) {
      e.preventDefault();
      filterInput.value = '';
      render();
    }
  });
  filterClear.addEventListener('click', function () {
    filterInput.value = '';
    render();
    filterInput.focus();
  });

  /* ---------- Keyboard shortcuts ---------- */
  function isTyping(t) {
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  document.addEventListener('keydown', function (e) {
    if (editor.open || help.open) return;
    if (e.key === 'Escape') {
      if (!menu.hidden) { e.preventDefault(); closeMenu(true); return; }
      if (!wipPop.hidden) { e.preventDefault(); closeWip(true); return; }
      return;
    }
    if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!menu.hidden && menu.contains(e.target)) return;

    const li = e.target && e.target.closest ? e.target.closest('.card') : null;
    if (li && e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) !== -1) {
      e.preventDefault();
      const id = li.dataset.id;
      const which = e.target.classList.contains('card-move') ? 'move' : 'open';
      const col = colOf(id);
      if (!col) return;
      if (e.key === 'ArrowUp') { shiftCard(id, -1, which); return; }
      if (e.key === 'ArrowDown') { shiftCard(id, 1, which); return; }
      const i = COLS.findIndex(function (c) { return c.id === col; });
      const j = i + (e.key === 'ArrowRight' ? 1 : -1);
      if (j < 0 || j >= COLS.length) return;
      moveToColumn(id, COLS[j].id, which);
      return;
    }

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      let col = isMobile() ? activeCol : 'todo';
      if (li) col = colOf(li.dataset.id) || col;
      else if (e.target && e.target.closest) {
        const sec = e.target.closest('.column');
        if (sec) col = sec.dataset.col;
      }
      if (isMobile()) setActive(col);
      refs[col].input.focus();
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      filterInput.focus();
      filterInput.select();
      return;
    }
    if (e.key === '?') {
      e.preventDefault();
      openHelp();
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !dragId && !editor.open) render();
  });

  /* ---------- Init ---------- */
  setActive('todo');
  updateThemeBtn();
  updateCelebrateBtn();
  render();
})();
