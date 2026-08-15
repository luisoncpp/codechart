# Working-tree untracked adds need a rename fallback

**Context:** Visualize-diff local changes run `git diff -M <before>` for tracked files, then append synthetic `new file` patches for eligible untracked files.

**What we learned:** Git rename detection only sees the files in that one `git diff` invocation. A working-tree `mv` without `git add` is a tracked delete plus an untracked add; the add is concatenated later, so `-M` never pairs them. Header parsing is not enough — leftover deleted×added files need a content/basename 1:1 matcher (and paste mode needs the same when the diff has no `rename from`/`rename to` lines).
