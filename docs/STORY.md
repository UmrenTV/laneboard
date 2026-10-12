# The story of Laneboard
A shared-screen kanban board for small teams: To do, Doing, Done, and nothing in the way.
## The request
> A kanban board for a small team: columns To do, Doing and Done, cards with a title, notes and a due date, drag and drop between columns, a text filter, and dark mode.
Asked for as a web app on 2026-10-12 and built by the Vibe Hub app factory on Claude Opus 5.5. It is self-contained: no accounts, no servers, data stays on the device.
## What the research found
Trello, Jira and similar kanban tools show work as columns of cards that move left to right as work progresses. Cards hold a description, due date, labels and checklists, and users move them by dragging. Common extras in the full tools are swimlanes and WIP limits. A vanilla JS version should use native HTML5 drag and drop and also offer a keyboard or button way to move cards, because drag and drop alone is not accessible. Everything should persist to localStorage and work offline.
### What users expect from apps like this

- Three fixed columns (To do, Doing, Done) with a card count per column
- Add, edit and delete cards with title, notes and due date
- Drag and drop cards between columns and reorder them within a column, with a visible drop target
- Overdue and due-soon highlighting on the due date
- Live text filter over title and notes
- Dark mode toggle that follows the system setting and is remembered
- Automatic persistence in localStorage
- Keyboard and button alternative to dragging (for example a Move to menu)
### What full versions add later

- Labels or colour tags and assignee avatars for team members
- Checklists and comments inside the card
- WIP limits per column with a warning
- Swimlanes or grouping by assignee
- Undo/redo and an activity log
- JSON export/import for backup and sharing, multiple boards, custom columns
### Patterns that work

- Horizontal board with equal-width columns that scroll vertically on their own, and one column at a time on mobile
- Compact cards showing the title, a due-date badge and a notes indicator; click to open a modal or side panel for editing
- Quick-add input at the bottom of each column, with Enter to save
- Drag feedback: dim the dragged card and highlight the column or insertion point under the pointer
- Search box in the header that dims or hides non-matching cards and shows a match count
- CSS variables for the theme, with a header toggle for dark mode
### References

- [Trello - Cloud Project and Task Management (feature overview)](https://github.com/Trello-kanban-boards/.github/releases/tag/Trello-kanban-boards)
- [Make drag and drop accessible - Frontend Checklist](https://frontendchecklist.io/rules/accessibility/draggable-accessibility)
- [Kanban Swimlanes: What They Are, How to Use Them - Leantime](https://leantime.io/kanban-swimlanes/)
- [Kanban board in Vanilla JS with keyboard navigation, native drag and drop, undo/redo](https://github.com/HugoAdama/Kanban_Tableu)
## The plan
Laneboard is a lightweight kanban board for small teams who want to see their work at a glance without signing up for anything. The board has three columns, To do, Doing and Done, each with a live card count. Each card holds a title, optional notes and an optional due date. Add a card from the quick-add box at the bottom of any column and press Enter. Click a card to open an editing panel where you can change its details or delete it. Moving work forward is a matter of dragging a card to another column or to a new position in the same column. A highlighted insertion line shows where it will land. If you prefer the keyboard or a touchscreen, every card also has a Move to menu. Due dates are colour-coded so overdue and due-soon work stands out. A filter box in the header narrows the board to matching cards as you type. Dark mode follows your system setting and remembers your choice. Everything saves automatically in your browser and works offline. On a phone the board shows one column at a time. On a desktop all three columns sit side by side.
Scope: simple. Layout: vanilla HTML, CSS and JavaScript, offline, local storage.
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
### Left out on purpose

- Labels, colour tags and assignees
- Checklists and comments inside cards
- WIP limits and swimlanes
- Undo/redo and an activity log
- Multiple boards and custom or renamed columns
- JSON export/import and real-time multi-user sync
## Versions
- v1 (2026-10-12): A shared-screen kanban board for small teams: To do, Doing, Done, and nothing in the way.
- v2 (2026-10-12): Labels, Checklists and Celebrations
The current version is v2. Every version is a commit on `main`; CHANGELOG.md has the details and docs/TESTING.md how each one was checked.
