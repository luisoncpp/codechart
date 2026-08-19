---
id: canvas_edges
label: Edge Layer
color: "#059669"
icon: share
descriptionShort: Custom SVG edge rendering & styling
---

The custom SVG edge layer (React Flow receives `edges={[]}`): floating border anchors, bowed soft-edge paths, style buckets with caching, selection/diff-aware edge coloring (`styleEdge`), and live node-box extraction for endpoint math. Viewport-culls segments to the padded world rect, merges visible strokes to one `<path>` per style bucket, and draws arrow geometry only at zoom ≥ 1.5 on the visible subset.
