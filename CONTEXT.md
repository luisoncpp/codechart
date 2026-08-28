# CodeChart

CodeChart helps a developer understand and review a codebase through its visual architecture map and source views.

## Language

**Review Note**:
A short-lived, single-user reminder that points out something to **fix** in the code. It has one editable text body and is either active or deleted: completing it removes it rather than preserving a resolution history. It is not an explanation of a change, not a conversation, and not long-term documentation.
_Avoid_: Comment thread, discussion, conversation, code documentation, Diff Note

**Review Note Anchor**:
A contiguous range of one or more whole source lines in a single module. It identifies the code a **Review Note** concerns without narrowing the selection to individual characters.
_Avoid_: Character selection, text span

**Diff Overlay**:
The session visualization of one change set on the architecture map (pasted unified diff, two git commits, or local changes). The overlay document is a unified diff in the current format; **Diff Note Markers** are an optional attribute of that same text. A raw diff with no markers is still a complete overlay and must behave as it does today. Git commit and local-changes overlays keep today's behavior: they still apply from git output, which has no markers, so they have no **Diff Notes**. Pasted overlays that differ only in marker lines are the same overlay identity. Unbound marker runs are dropped without rejecting the overlay; CodeChart shows a floating warning with the dropped text, a copy action, and a close action. Close hides the warning only; it does not edit the overlay document.
_Avoid_: Narrative Diff Visualizer as a second product; that original name covers the overlay plus the still-unbuilt storytelling pieces

**Diff Note**:
A read-only explanation of a **Diff Overlay**, exclusive to that overlay. It explains a **Diff Note Target** the way a code comment would, but it lives outside the source and is never authored, edited, dismissed, or generated inside CodeChart. When present, it is a run of **Diff Note Marker** lines interleaved in the overlay's unified diff; the order of those notes is their review order, not a walk the app plays. The body is Markdown for display only. Diff Notes are that optional attribute of the overlay document, not a separate collection. They start expanded. In a source view (L2 or a document/symbol preview) they render after their **Diff Note Target** and above any **Review Notes** on the same lines. They do not appear on the canvas. A reviewer may collapse one so surrounding code is readable; collapse is not completion and does not remove it. It is not a **Review Note** (those mark things to fix).
_Avoid_: Annotation, comment, PR comment, Review Note, Diff Review, reminder, todo, dismiss

**Diff Note Marker**:
An optional line in an overlay unified diff whose first character is `#` in column 0. Consecutive marker lines are one **Diff Note**. An added or context comment in the source is `+#` or ` #`, not a marker. Their absence does not invalidate the diff. A marker run that cannot bind to a same-prefix hunk run is dropped; the overlay still applies.
_Avoid_: hunk body, code comment, trailer section, required notes block

**Diff Note Target**:
A contiguous range of one or more whole source lines in a single module of a **Diff Overlay**. It is the maximal same-prefix hunk run immediately above the **Diff Note** (`+` → after, `-` → before, context → after). A replace (`-` then `+`) is two targets if both sides are explained: one note after the deletion run, one after the addition run. Unlike a **Review Note Anchor**, it can sit on deleted rows.
_Avoid_: Review Note Anchor, character selection, module-only target, edge target, after-only range, mixed-prefix range

**Diff Review**:
Per-file progress on a **Diff Overlay**: which changed files the reviewer already checked. It is not a **Diff Note** and not a **Review Note**.
_Avoid_: Diff Note, Review Note, comment

## Example dialogue

**Developer:** I left a Review Note anchored to the validation block's lines because that branch is wrong.

**Domain expert:** Once you have fixed it, mark it done; CodeChart will delete it rather than archive it.

**Developer:** The reviewed code was replaced and its anchor cannot be recovered, so CodeChart discarded the Review Note.

**Developer:** I visualized main..feature from the commit pickers.

**Domain expert:** That Diff Overlay behaves as it does today. Git's unified diff has no Diff Note Markers, so there are no Diff Notes. To read explanations you paste an annotated unified diff instead.

**Developer:** I visualized a raw paste, marked files reviewed, then pasted the same hunks with `#` Diff Note Markers added.

**Domain expert:** Same overlay identity: the markers are optional. Diff Review progress stays. The new text only adds Diff Notes. CodeChart consumed them; it did not write them.

**Developer:** I am at L1 on an annotated overlay.

**Domain expert:** Diff Notes are not on the canvas. Open L2 or a preview on a changed module to read them, above any Review Notes on those lines.
