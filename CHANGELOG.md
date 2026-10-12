# Changelog

All notable changes to Laneboard. Each version is one commit on `main`, published by the Vibe Hub app factory after its checks passed.

## v2 — Labels, Checklists and Celebrations (2026-10-12)

Laneboard gains a small set of opt-in features that make it more capable and more fun. The three columns and quick-add stay as they are. Cards can carry colour labels and a checklist, shown as tiny badges and a progress bar on the compact card. Doing can have a soft WIP limit, and a 'Done this week' counter tracks finished cards. Cards dropped into Done get a short confetti burst, delete and move can be undone from a toast, and keyboard shortcuts with a '?' help overlay speed everything up. Existing boards migrate automatically with nothing lost.

### Added

- Colour labels (6 fixed colours, optional names) on cards
- Checklists inside cards with a progress badge and bar on the compact card
- Optional soft WIP limit on the Doing column
- 'Done this week' counter in the header
- Confetti and bounce when a card lands in Done, with a Celebrations toggle and reduced-motion support
- Undo toast after delete and cross-column moves
- Keyboard shortcuts and a '?' help overlay
- Versioned localStorage schema with automatic migration

### Changed

- Card modal gains a collapsible 'More' section for labels and checklist
- Compact cards show label dots and checklist progress when present
- Filter also searches label names and checklist items
- Doing column count can show a limit and turn amber
- Header gains the weekly counter and the Celebrations toggle
- Delete still asks for confirmation and now also offers Undo afterwards

Requested as: "make it more fun and complicated and more features."

## v1 — First build (2026-10-12)

A shared-screen kanban board for small teams: To do, Doing, Done, and nothing in the way.

### Features

- Three fixed columns (To do, Doing, Done), each showing a live count of its cards.
- A quick-add input at the bottom of each column creates a card when you press Enter.
- Clicking a card opens a modal where you can edit its title, notes and due date, or delete it after a confirmation.
- Compact cards show the title, a due-date badge and an icon when the card has notes.
- Native drag and drop moves cards between columns and reorders them within a column, dimming the dragged card and showing an insertion line.
- A Move to menu on each card moves it to another column or up and down, without dragging and from the keyboard.
- Due-date badges turn red when a card is overdue and amber when it is due within two days; cards in Done are never flagged.
- A header filter matches text in titles and notes as you type, hides cards that don't match and shows a match count with a clear button.
- A header toggle switches dark mode, defaults to the system setting and remembers your choice.
- The board saves automatically to localStorage, survives reloads and works fully offline.
- The layout is responsive: three columns side by side on desktop, and one column at a time with column tabs on a phone.
