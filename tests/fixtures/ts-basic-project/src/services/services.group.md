---
id: services
label: Services
color: "#0ea5e9"
icon: plug
facades:
  - index.ts
exclude:
  - types.ts   # ceded to the cross-cutting `shared` group
descriptionShort: Data access
---

Data access layer. Wraps network calls behind http.ts so the rest of the app never calls fetch directly. Exposes fetchTitles through the facade (index.ts).
