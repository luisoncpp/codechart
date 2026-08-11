# Folder inference needs every path prefix, not just leaf parent dirs

When inferring groups from the directory tree (no `*.group.md`), a group must
exist for every directory segment on the path to each file — not only directories
that directly contain a source file.

Monorepos with `crates/*/src/` layouts only place files under `src/` or deeper.
If inference stops at immediate file parents, `crates/planning-app` never becomes
a group and each `src` folder appears as a root sibling labeled "Src".

Expand each file's parent path into all prefixes before building the group tree.
