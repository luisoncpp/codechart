---
id: canvas_wiki_links
label: Wiki Links
color: "#7c3aed"
icon: link
descriptionShort: `[[path]]` links in comments and docs
---

Everything a `[[target]]` link is, independent of where it is rendered: the bounded scan that finds link spans in a line of text, the pure path resolution (file-relative, repo-relative, module-path suffix fallback, root-escape guard), the `marked` inline extension that turns links inside rendered markdown into anchors, and the single DOM helper that reads a clicked link back out of an event. Rendering lives in `highlight/`, opening lives in `preview_frames/`.
