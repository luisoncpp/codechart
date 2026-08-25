---
id: tsconfig_paths
label: TSConfig Paths
color: "#3b82f6"
icon: file-code
facades:
  - mod.rs
descriptionShort: Loads tsconfig paths and maps @ import aliases
architectureDoc: docs/architecture/references-analysis.md
---

Loads `compilerOptions.paths` and `baseUrl` from `tsconfig.json` or `jsconfig.json`, mapping `@/…` import aliases to repo-relative module paths for the resolver.
