# Laneboard

A shared-screen kanban board for small teams: To do, Doing, Done, and nothing in the way.

Laneboard shows your team's work at a glance. You don't need an account or a server. It runs entirely in your browser, saves automatically and works offline.

## Features

- **Three fixed columns** (To do, Doing, Done), each with a live card count.
- **Quick add**: type in the box at the bottom of any column and press Enter.
- **Card editor**: click a card to edit its title, notes, due date and column. Deleting a card asks for confirmation first.
- **Compact cards**: each card shows its title, a due-date badge and an icon when it has notes.
- **Drag and drop**: move cards between columns or reorder them within a column. The dragged card dims and an insertion line shows where it will land. On a phone, drag a card over a column tab to switch to that column.
- **Move to menu**: every card has a move button with Move to (column), Move up and Move down. It works with the keyboard (Tab, Enter, arrow keys, Escape) and on touchscreens.
- **Due-date warnings**: a badge turns red when a card is overdue and amber when it is due today or within two days. Cards in Done are never flagged.
- **Live filter**: searches titles and notes as you type. Cards that don't match are hidden, a match count appears, and a clear button (or Escape) resets the board.
- **Dark mode**: follows your system setting by default. The header toggle remembers your choice.
- **Automatic saving** to localStorage. Your board survives reloads and stays in sync across tabs.
- **Export and import**: download the board as JSON or load it back. An import can be undone straight away.
- **Responsive layout**: on a desktop the three columns sit side by side. On a phone you see one column at a time, with column tabs to switch.

## How to run

Open `index.html` in any modern browser. There is no install and no build step, and no network access is needed.

## Files

- `index.html`: the page structure
- `styles.css`: layout and the light and dark themes
- `app.js`: all of the board's behaviour

Built with Claude Opus 5.5 through the Vibe Hub app factory.

Public domain: use, copy and modify it freely, with no license restrictions.

## Run it

Open `index.html` in any browser: the app is a single static page (HTML, CSS and vanilla JavaScript), works offline and keeps its data in the browser's local storage. `manifest.webmanifest` lets browsers install it as an app.

## Host it

Upload the folder to any static host (Netlify, Vercel, GitHub Pages, an S3 bucket) or serve it with `npx serve .`.

## Built with

Claude Opus 5.5 through the Vibe Hub app factory (web target, simple scope). No license restrictions: copy, change and sell it.
