# Product

## Register

product

## Users

Developers, reviewers, architects, and tech leads working across TypeScript, Rust, C#, and Unity codebases. They open CodeChart when they need to see structure—not read files linearly: exploring a repo, walking a PR, enforcing group boundaries, or explaining architecture to others. Context is a desktop session with a large canvas, often alongside an IDE or diff tool.

## Product Purpose

CodeChart turns imports, annotations, and optional `*.group.md` configuration into an interactive architecture map. It helps teams comprehend structural intent at a glance—how modules connect, where facades are bypassed, how a change propagates—without replacing the editor or git. Success is instant structural clarity: the map answers "what depends on what?" and "what broke the rules?" faster than scrolling diffs.

## Brand Personality

Approachable, clear, teaching-oriented. The UI explains structure without shouting; the canvas is the hero, chrome stays quiet. Voice is plain and direct—labels name things developers already know (module, group, facade, violation). Visual tone favors readable hierarchy over spectacle: a patient guide through complexity, not a dashboard of badges or a terminal cosplay.

## Anti-references

- Neon cyber / hacker-terminal aesthetics (glow, matrix green, faux-retro CRT chrome).
- Over-dense dashboards: too many simultaneous panels, competing badges, decorative metrics, or nested cards that fight the graph for attention.
- Generic SaaS marketing patterns if a public site is added later (cream hero, gradient eyebrows, hero-metric templates).
- Color-only encoding for critical states (violations, diff highlights)—shape, weight, or pattern must reinforce meaning.

## Design Principles

1. **Clarity over decoration** — Every pixel on chrome earns its place; the graph is the primary surface. Reduce cognitive load before adding personality.
2. **Show structure, not summaries** — Prefer spatial relationships (groups, edges, zoom levels) over stat cards or abstract KPIs.
3. **Teach through the map** — Selection, zoom tiers, and inspection should make boundaries and dependencies obvious to someone new to the codebase.
4. **Honest density** — Support large graphs without hiding complexity behind faux simplicity; progressive disclosure (L0→L2) beats collapsing everything into icons.
5. **Trust the analysis** — Diagnostics, violations, and diff overlays must feel authoritative and legible; ambiguous styling erodes confidence in the engine.

## Accessibility & Inclusion

Standard desktop accessibility as baseline: keyboard reachability for primary controls, visible focus, sufficient contrast on chrome and labels, semantic structure in panels. Follow WCAG 2.1 AA where practical for text and controls. Respect `prefers-reduced-motion` for any canvas or panel transitions. Do not rely on color alone for edge types, violations, or diff states—pair hue with stroke weight, dash pattern, or icons.
