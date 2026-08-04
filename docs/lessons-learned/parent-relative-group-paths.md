# Parent-relative group paths keep sibling facades nested

Group paths are joined to the group-file directory and normalized, so `facades`,
`files`, `exclude`, and glob-form `match` all support `..`. A group in
`domain/Widget/` can therefore own sibling `domain/Widget.ts` with
`../Widget.ts`, while remaining nested under `domain`.

An explicit group nested below a folder-ownership group takes precedence for
the files it claims, so the parent needs no `exclude`. Do not add
`groups: [widget]` merely to force nesting: that turns the parent into a
composition group and disables its implicit folder ownership. Unrelated
cross-cutting explicit claims still need the folder owner to use `exclude`.
