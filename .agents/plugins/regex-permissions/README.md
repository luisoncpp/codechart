# Regex Permissions Plugin

An Antigravity plugin that automatically approves safe terminal commands matching regular expressions (such as focused unit tests, linting, and git inspection), eliminating repetitive confirmation prompts while keeping other commands protected.

---

## How It Works

1. When the agent triggers `run_command`, Antigravity invokes the `PreToolUse` hook defined in [hooks.json](file:///c:/Proyectos/meetings-myself/.agents/plugins/regex-permissions/hooks.json).
2. [auto_approve.js](file:///c:/Proyectos/meetings-myself/.agents/plugins/regex-permissions/auto_approve.js) checks the command against patterns in [patterns.json](file:///c:/Proyectos/meetings-myself/.agents/plugins/regex-permissions/patterns.json).
3. If it matches an `allow` pattern, it returns `{"decision": "allow"}` to proceed instantly.
4. If it matches a `deny` pattern, it blocks the command immediately.
5. If no pattern matches, it returns `{"decision": "ask"}` to ask you for confirmation as usual.

---

## Customizing Patterns

Edit [patterns.json](file:///c:/Proyectos/meetings-myself/.agents/plugins/regex-permissions/patterns.json) to add or modify rules:

```json
{
  "allow": [
    "^npm\\s+test(\\s+.*)?$",
    "^npm\\s+run\\s+(test|check|lint|audit)(:.*)?(\\s+.*)?$",
    "^npx\\s+(vitest|jest|playwright|eslint|prettier|fallow)(\\s+.*)?$",
    "^cargo\\s+(test|check|clippy)(\\s+.*)?$",
    "^git\\s+(status|diff|log|branch)(\\s+.*)?$",
    "^pytest(\\s+.*)?$",
    "^python\\s+-m\\s+pytest(\\s+.*)?$"
  ],
  "deny": [
    "^rm\\s+-rf",
    "^git\\s+push\\s+--force"
  ]
}
```

---

## Workspace vs Global Installation

- **Current Workspace**: Located at `.agents/plugins/regex-permissions/` (active automatically in this project).
- **All Projects (Global)**: Copy the entire `regex-permissions` directory into `~/.gemini/config/plugins/regex-permissions/` (or `%USERPROFILE%\.gemini\config\plugins\regex-permissions\` on Windows) to enable it across every workspace on your machine.
