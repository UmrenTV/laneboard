# Architecture of Laneboard

A single page of vanilla HTML, CSS and JavaScript. No framework, no build step, no network: state lives in memory and is persisted to `localStorage` so a reload brings everything back.

## Files

- `index.html` (7.4 KB): markup and the page shell
- `styles.css` (16.9 KB): all styling, including the dark theme
- `app.js` (46.2 KB): state, rendering and event handling
- `README.md` (2.7 KB): how to run it

## Data

Everything the user enters is kept in `localStorage` under the app's own keys; export and import, where present, move the same JSON.

## Features

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
