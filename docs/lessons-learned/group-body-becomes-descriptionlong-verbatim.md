# `*.group.md` body becomes `descriptionLong` verbatim — watch the golden's `app` em-dash

**What to know before Phase 4 (the exact golden diff).** `grouping` sets
`GroupNode.annotation.descriptionLong` to the `*.group.md` markdown **body, byte-for-byte**
(trimmed). It does not normalize punctuation. So the golden JSON's `descriptionLong`
strings must equal the bodies exactly, or the Phase 4 `analyze` diff fails.

This bit once: `app.group.md`'s body used a real UTF-8 em-dash (`—`,
`\xe2\x80\x94`) in "…claims no leaf module directly **—** src/main.ts…", but the
hand-authored `golden/project-graph.json` had a plain hyphen (`-`) there. A
single-character divergence the structural Phase 3 checkpoint
(assignments/parents/facades) does **not** catch — only an exact string diff
would. **Resolved in Phase 3** by fixing the golden to the em-dash (the body is
the source of truth per TDD §7: "descriptionLong = body" — never soften the body
to match the golden). All five groups now match byte-for-byte.

**General rule:** when hand-authoring golden annotation text that mirrors a source
file, copy from the file — don't retype. Em-dashes, curly quotes, and non-breaking
spaces are the usual silent offenders.
