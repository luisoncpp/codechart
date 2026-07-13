# Dragging via React state re-renders the whole canvas — move the DOM, commit on release

## Context

Preview frames (`preview_frames/frame-drag.ts`) were dragged by calling `setFrames` on every `pointermove`. Dragging felt laggy.

## What was learned

- Any state owned by (or lifted into) the component that renders `<ReactFlow>` is amplified: one `setState` re-renders `GraphCanvas`, which rebuilds the `nodes` array with a new identity, so React Flow reprocesses every node and `EdgeLayer` re-renders every edge. Per-pointermove state (60–120 Hz) turns a 2-px mouse move into a full app re-render.
- Overlay widgets holding large rendered content (a frame renders its whole tokenized source file) multiply the cost: every sibling frame re-renders too.
- The fix is the classic imperative-drag pattern: during the drag, write `style.top/left` directly on the dragged element; commit the position to React state **once on pointerup**. Layout math that reads live DOM rects (`placeAdjacentFrame`) keeps working because it never trusted React state for positions.
- Same principle at interaction start: a "bring to front" that returns `[...frames]` when it's already a no-op forces a full canvas re-render on every frame pointerdown. Returning the **same array reference** lets React bail out of the `setState`.

## Rule of thumb

For any continuous interaction (drag, resize, scrub) hosted near a React Flow canvas: mutate the DOM during the gesture, commit state at gesture end, and make no-op state updates return the previous reference.
