# Local Draft State Avoids Canvas Rerenders

`App` subscribes to `ReviewNotesStore` so note creation, deletion, and badge counts refresh the canvas. Publishing every character typed into a new Review Note through that store therefore re-renders the React Flow subtree on every keystroke. Keep unsaved draft text in the local composer and submit it to the store once; reserve store notifications for visible shared state changes.
