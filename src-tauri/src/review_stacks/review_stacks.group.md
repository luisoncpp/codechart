---
id: review_stacks_backend
label: Review Stacks Backend
color: "#7c3aed"
icon: layers
facades:
  - mod.rs
descriptionShort: Versioned per-diff Review Stack, Finding & agent Diff Note persistence
---

Owns validation, secure project-relative paths, and atomic persistence for `.codechart/review-stacks.json` keyed by `diffId`.
