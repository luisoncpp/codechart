---
id: app
label: Application
color: "#64748b"
icon: app-window
groups:
  - core
  - services
  - ui
ignore:
  - node_modules/**
  - dist/**
descriptionShort: Todo application
---

Top-level container composed from the core, services, and ui groups via group references (not folder ownership), so it claims no leaf module directly — src/main.ts stays ungrouped. Demonstrates membership-by-group-reference and explicit nesting.
