# Unquoted `#` in `*.group.md` YAML is a comment, not a wiki-link fragment

YAML treats `#` as a comment unless the scalar is quoted. Putting `[[path#Section]]` in an unquoted `descriptionShort` truncates the line (or fails the parse). A failed group file is a `configError`; its modules fold into the parent folder group, so the nested box disappears from the canvas.

Quote those values: `descriptionShort: "`[[path]]` and `[[path#Section]]` links"`.
