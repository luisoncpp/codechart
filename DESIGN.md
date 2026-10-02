---
name: CodeChart
description: Interactive architecture map for codebases — light, legible, canvas-first.
colors:
  canvas-bg: "#ffffff"
  chrome-bg: "#f8fafc"
  code-bg: "#fafafa"
  ink-strong: "#0f172a"
  ink-body: "#334155"
  ink-muted: "#64748b"
  ink-subtle: "#94a3b8"
  border-default: "#e2e8f0"
  border-strong: "#cbd5e1"
  selection: "#2563eb"
  edge-import: "#ea580c"
  edge-export: "#2563eb"
  edge-neutral: "#94a3b8"
  state-violation: "#dc2626"
  state-success: "#16a34a"
  state-warning: "#b45309"
  diff-add-bg: "#dcfce7"
  diff-remove-bg: "#fee2e2"
  diff-modify-bg: "#fef3c7"
  group-default: "#64748b"
typography:
  body:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
  mono:
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace'
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  xs: "3px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  group: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  overlay-chip:
    backgroundColor: "#ffffffcc"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "3px 8px"
  overlay-chip-selected:
    backgroundColor: "#ffffffcc"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.md}"
    padding: "3px 8px"
  button-ghost:
    backgroundColor: "{colors.canvas-bg}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  button-action-success:
    backgroundColor: "#ffffffcc"
    textColor: "#166534"
    rounded: "{rounded.md}"
    padding: "3px 8px"
  inspector-panel:
    backgroundColor: "{colors.chrome-bg}"
    textColor: "{colors.ink-body}"
    rounded: "0"
    padding: "{spacing.lg}"
---

# Design System: CodeChart

## Overview

**Creative North Star: "The Architecture Whiteboard"**

CodeChart looks like a well-lit whiteboard session: white canvas, colored group boundaries, crisp monospace labels on modules, and quiet slate chrome that never competes with the graph. The system teaches structure through spatial layout—groups as regions, edges as drawn relationships, zoom tiers as stepping closer to the board—not through dashboards or decorative UI.

Personality is approachable and clear (per PRODUCT.md): plain language, readable hierarchy, no terminal cosplay or neon accents. Density is moderate in chrome (readable calm) but can be high on the canvas where modules and symbols need to fit. The graph is always the hero; panels, badges, and modals exist to support orientation and inspection.

**Key Characteristics:**

- Light, border-defined surfaces; depth comes from group tint and canvas spatial layout, not drop shadows.
- System UI sans-serif; code and symbol labels in monospace.
- Semantic color on edges and diagnostics (orange import, blue export/selection, red violation, green diff-add).
- Small overlay controls (11px label scale) with semi-transparent white backgrounds over the canvas.
- Symbol kind badges use whisper tints; syntax highlighting uses a cool indigo/teal palette.

## Colors

A cool slate neutral base with functional accents reserved for graph semantics—not chrome decoration.

### Primary

- **Selection Blue** (#2563eb): Selected module/symbol outlines, export-edge emphasis, focused interaction affordances on the canvas.
- **Import Orange** (#ea580c): Import dependency edges when highlighted or typed.

### Secondary

- **Indigo Keyword** (#4f46e5): Syntax keyword emphasis inside L2 source views (part of the code-reading palette, not chrome).

### Tertiary

- **Teal String** (#0f766e): String literals and type-adjacent accents in syntax views.

### Neutral

- **Canvas White** (#ffffff): React Flow pane, module card faces, modal surfaces.
- **Chrome Mist** (#f8fafc): Inspector panel, widget headers, L2 code gutter backgrounds.
- **Code Paper** (#fafafa): Source preview bodies, L2 scroll areas.
- **Ink Strong** (#0f172a): Widget titles, context menu labels.
- **Ink Body** (#334155): Primary readable text in code previews and module content.
- **Ink Muted** (#64748b): Secondary labels, paths, inspector hints, default group color.
- **Ink Subtle** (#94a3b8): Tertiary metadata, line numbers, disabled hints.
- **Border Default** (#e2e8f0): Panel dividers, chip borders, module chrome separation.
- **Border Strong** (#cbd5e1): Floating widget frames, dropdown outlines.

### Named Rules

**The Semantic Color Rule.** Accent hues on chrome are rare. Orange, blue, red, green, and yellow on the canvas encode edge type, selection, violation, or diff state—never decoration.

**The Group Tint Rule.** Group containers use their configured hue at ~8% opacity fill (`${color}14`) with a 2px solid border in the full group color. User/group config drives color; the UI does not impose a single brand accent across groups.

## Typography

**Display Font:** Not used—CodeChart has no marketing hero type; hierarchy stays utilitarian.

**Body Font:** System UI sans (`ui-sans-serif, system-ui, …`) for chrome, inspector, overlays, and group descriptions.

**Label/Mono Font:** UI monospace stack for module filenames, symbol boxes, L2 source, and line numbers.

**Character:** Technical but approachable—system fonts for zero-load clarity; monospace where code identity matters.

### Hierarchy

- **Title** (600, 14px, 1.3): App bar product name, widget titles.
- **Body** (400, 13px, 1.5): Inspector values, descriptions; keep prose under ~70ch in panels.
- **Label** (600, 11px, 0.04em letter-spacing, uppercase in section headers): "Inspector" panel kicker, metadata section labels.
- **Caption** (400, 10–12px): Paths, status hints, commit metadata, line numbers.
- **Mono body** (400, 9–11px, 1.5): Symbol boxes (9px), L2 source (11px), syntax-highlighted tokens.

### Named Rules

**The Mono-on-Code Rule.** Anything that names a file, symbol, or line of source uses the monospace stack. Chrome labels stay sans-serif.

## Elevation

Border-only depth by default. Surfaces sit flat on the canvas; separation is 1–2px slate borders and background tints. Group regions read as colored outlines on white paper, not floating cards.

Shadows appear only for ephemeral floating layers: modals (`0 12px 40px #0f172a33`), dropdown menus (`0 10px 30px #0f172a22`), and the symbol source widget (`0 10px 15px -3px rgb(0 0 0 / 0.1)`). Never pair a 1px border with a wide soft shadow on the same resting element.

### Named Rules

**The Flat Canvas Rule.** Module and group nodes on the graph have no box-shadow at rest. Selection uses outline (2–3px solid #2563eb), not elevation.

## Components

### Buttons

- **Shape:** Small radius (4px) for inspector controls; 6px for canvas overlay actions.
- **Primary (native):** Browser default in the loader bar today—future work should align to ghost/overlay patterns below.
- **Ghost:** White fill, 1px `#e2e8f0` border, `#475569` text, 2px 6px padding (hide inspector, panel actions).
- **Action success:** Semi-transparent white bg, `#86efac` border, `#166534` text ("Visualize diff…").
- **Hover / Focus:** Subtle background shift to `#e2e8f0` on icon closes; no transform bounce.

### Chips / Overlays

- **Style:** `#ffffffcc` background, 1px `#e2e8f0` border, 6px radius, 11px sans, `#475569` text.
- **State:** Level badge is non-interactive; filter chips use checkbox + label pattern.

### Cards / Containers

- **Module cards:** White face, group-color border, optional facade styling; selected → 2px blue outline.
- **Group containers:** 10px radius, 2px solid group color, tinted fill; collapsed card variant for L0.
- **Symbol boxes:** 3px radius, kind-specific whisper tint + saturated badge column (13px). During an L1.5 diff, semantic fills override kind tints: green/solid for added, red/dashed for removed, and yellow/dotted for declaration or implementation changes.
- **Border Strategy:** Primary depth cue; no shadow on graph nodes.

### Inputs / Fields

- **Style:** Commit search uses `#f8fafc` fill, `#cbd5e1` border; dropdown list white with divider rows.
- **Focus:** Selected commit row `#eef2ff` background, `#3730a3` text.

### Navigation

- **Top bar:** Horizontal flex, 8px 16px padding, bottom border `#e2e8f0`; no product title (it lives in the window title bar). Left: Open folder…, project chip (basename, `#f8fafc` fill, full path tooltip), ↻/⚙ icon buttons, View ▾ / Search ▾ dropdown menus; right: status text.
- **Inspector:** Fixed-width aside, `#f8fafc` fill, left border; uppercase 11px section label.

### Modals & Floating Widgets

- **Modal scrim:** `#0f172a66` overlay; panel white, 8px radius, soft shadow only here.
- **Symbol widget:** 8px radius, resizable, header `#f8fafc`, active line amber highlight (`#fef3c7` + 3px `#d97706` left bar).

### Graph Edges (canvas primitives)

- **Import:** `#ea580c` solid; **Export/selection focus:** `#2563eb`; **Neutral:** `#94a3b8`; **Violation:** `#dc2626` thicker stroke; **Soft seams:** dashed `#94a3b8`; **Diff added/removed:** green/red with weight change.

## Do's and Don'ts

### Do:

- **Do** keep the canvas white and maximally legible; group color carries identity on the graph.
- **Do** encode edge and diagnostic meaning with hue plus stroke weight or dash pattern (violations thicker, soft edges dashed).
- **Do** use monospace for paths, symbols, and source; sans-serif for explanatory chrome.
- **Do** respect `prefers-reduced-motion`: replace widget fade-in with instant show when reduced motion is requested.
- **Do** maintain ≥4.5:1 contrast for inspector body text (`#334155` on `#f8fafc`, `#475569` on white).

### Don't:

- **Don't** use neon cyber / hacker-terminal aesthetics (glow, matrix green, CRT chrome)—per PRODUCT.md anti-reference.
- **Don't** build over-dense dashboards: avoid extra panels, decorative metric cards, or nested cards that compete with the graph.
- **Don't** rely on color alone for violations or diff states; pair semantic hues with stroke weight, border style, or icons.
- **Don't** add side-stripe accent borders (>1px colored left/right bars) on inspector rows or alerts.
- **Don't** pair 1px borders with wide soft shadows on the same resting button or card—the ghost-card tell.
- **Don't** round graph containers beyond 10px (groups) or 3px (symbols); pills are for overlay chips only.
