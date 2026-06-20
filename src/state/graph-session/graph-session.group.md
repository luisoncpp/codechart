---
id: graph-session
label: Graph Session
color: "#2563eb"
icon: database
descriptionShort: Session state & selection
---

Holds the live session: loaded graph, phase, and current selection, exposed via an event-emitting store and a React adapter hook. The facade (index.ts) is public; the store internals and hook wiring are private.
