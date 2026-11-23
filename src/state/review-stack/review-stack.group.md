---
id: review-stack
label: Review Stack State
color: "#7c3aed"
icon: layers
descriptionShort: Live Review Stack, spotlight, blast radius, and findings state
---

Owns the active diff's persisted `ReviewStackRecord` (cohorts with hunks, findings, agent Diff Notes), cohort spotlight selection and its per-file hunk ranges, blast radius overlay depths, severity filter, and one-shot navigation / cohort-explanation requests. Record mutations are pure (`stack-mutations.ts`).
