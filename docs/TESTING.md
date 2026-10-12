# Testing Laneboard (v2)
How the Vibe Hub app factory checked this version before publishing it, and how to repeat the checks.
## Static checks
Every required file present, the page loads only its own files, every script parses, stylesheets balance their braces, JSON files parse.
Findings on the published files:

- warning app.js: contains TODO/FIXME or placeholder text
## Browser run
Opened in headless Chromium on a phone (390×844, dark) and a desktop (1280×800, light): no uncaught errors, no console errors, no failed requests, nothing leaving the page, a title, visible content, no sideways scroll on the phone, 4 buttons clicked, a field filled and submitted, and a reload.

Result: clean
## Acceptance scenarios
3 of 4 scenarios passed.

| Scenario | Result |
| --- | --- |
| Green label and ticked checklist item show on compact card | pass |
| Undo restores a deleted card | fail: step 5 (click "Delete"): refused to click a destructive control: "Delete" |
| Filter finds text that only appears in a checklist item | pass |
| Help shortcut works and is ignored inside quick-add | pass |
The model repaired the app 2 times during verification; the checks above are for the published files.
## Tester's checklist
- [ ] Add a card in each column using the quick-add input and Enter, and confirm each column's count updates.
- [ ] Open a card, add notes and a due date, save, and confirm the notes icon and due badge appear; then delete a card and confirm it disappears.
- [ ] Drag a card from To do to Doing, then reorder two cards within one column, and confirm the insertion line shows during the drag and the order is correct after dropping.
- [ ] Use the Move to menu with only the keyboard (Tab, Enter or arrow keys) to move a card to Done.
- [ ] Set one card's due date to yesterday and another's to tomorrow, and confirm the red and amber highlighting; move the overdue card to Done and confirm the warning goes away.
- [ ] Type in the filter and confirm non-matching cards hide, the match count is correct, matches in notes are found, and clearing the filter restores the board.
- [ ] Toggle dark mode, reload the page, and confirm the theme, all cards, their columns and their order persist.
- [ ] Resize to phone width and confirm one column shows at a time, the column tabs switch between columns, and editing and moving cards still work.
## Repeat it yourself
Open `index.html` in a browser (or serve the folder with any static server), then walk the checklist above on a phone-sized window and a desktop one. Reload: your data must still be there.
