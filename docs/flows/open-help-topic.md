# Flow: open a help topic and copy its Markdown

## Trigger

Clicking **Help ▾** in the top toolbar and selecting one of:
- **Groups format...**
- **Architecture tags...**
- **Diff notes...**
- **Wiki links...**

## Entry point

`HelpMenu` (`src/features/help_menu/Private/HelpMenu.tsx`) $\rightarrow$ `HelpModal` (`src/features/help_menu/Private/HelpModal.tsx`).

## Step-by-step sequence

1. **User clicks Help ▾**: `DropdownMenu` opens showing the list of documentation topics.
2. **User selects a topic**: `onSelect` sets `activeTopic` to the selected `HelpTopic` (`groups-format`, `architecture-tags`, `diff-notes`, or `wiki-links`) and closes the dropdown menu.
3. **Modal opens**: `HelpModal` renders as a centered dialog with a backdrop overlay, displaying the topic title and rendered Markdown via `HelpMarkdownView`.
4. **Copy Markdown**: Clicking **Copy as Markdown** calls `navigator.clipboard.writeText(topic.markdown)` and transitions button text to "✓ Copied!" for 2 seconds.
5. **Dismissal**: Modal closes when clicking the header close button (✕), footer Close button, pressing Escape, or clicking the backdrop overlay.

## Reads

- `HELP_TOPICS` dictionary in `help-docs.ts`.

## Writes

- Local React state in `HelpMenu` (`activeTopic`) and `HelpModal` (`copied`).
- Clipboard text via `navigator.clipboard.writeText`.

## Side effects

- None on project graph, canvas, or persistent settings.

## Files to inspect

| File | Why |
|---|---|
| `src/features/help_menu/Private/HelpMenu.tsx` | Toolbar menu trigger & topic selection |
| `src/features/help_menu/Private/HelpModal.tsx` | Modal dialog, copy button, dismissal |
| `src/features/help_menu/Private/HelpMarkdownView.tsx` | Markdown rendering with Marked |
| `src/features/help_menu/Private/help-docs.ts` | Topic Markdown text |
