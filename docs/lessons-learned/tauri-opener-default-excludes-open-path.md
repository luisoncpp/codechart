# Tauri opener default excludes path opening

`opener:default` sounds broad, but it only grants default URL opening and
reveal-in-explorer. Calling `openPath` with that capability rejects at runtime,
even when the opener plugin is registered and the executable is valid.

Any feature that launches a file or configured application must also declare
`opener:allow-open-path` in the window capability. Granting the command is only
the first gate: its scope must include a matching `{ path, app }` entry. For a
feature whose project roots and editor executables are both selected at runtime,
that means an all-project path pattern and `app: true`; otherwise Tauri reports
`Not allowed to open path ... with ...`.

Await the frontend call and surface its rejection; fire-and-forget handling
turns a permission, scope, or executable error into a control that appears to do
nothing.
