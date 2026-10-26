# MSI Version Major Is Capped at 255

Calendar versioning (`2026.9.21`) is valid for `tauri.conf.json` and the NSIS installer, but the MSI bundle (WiX `ProductVersion`) rejects any major above 255 with `app version major number cannot be greater than 255`. The NSIS `.exe` is already built by then, so the failure looks like it happens after a successful build.

- Fix: set `bundle.windows.wix.version` in `src-tauri/tauri.conf.json` to a `major.minor.patch` with major ≤ 255 (e.g. `26.9.21` for `2026.9.21`). Tauri derives the MSI version from `version` only when this field is unset.
- Keep `version` itself as-is; it still drives the installer file names and the app version shown to users.
- Changing `wix.version` later changes what Windows Installer compares for upgrades. Keep it stable across releases.
