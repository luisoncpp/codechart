# Node Border Clips Absolute Sticky Children

When building "sticky" overlays inside React Flow nodes (e.g., an absolutely-positioned div that stays visible as the node is panned partially off-screen), you typically use `getBoundingClientRect()` to compute the node's bounds relative to the viewport. 

However, if the node container has a CSS `border` and `overflow: hidden`, `getBoundingClientRect()` returns the **outer** dimensions of the node, which includes the border width.

If you size an `absolute` child to this outer width/height and position it at `left: 0` / `top: 0` (which aligns to the inner edge of the content box in a `border-box` container), the child will overflow the inner content box on the right and bottom by `2 * borderWidth`.

Because the container has `overflow: hidden`, this overflowing area is clipped. If your custom scrollbars or UI elements are pinned to the right (`right: 0`) or bottom (`bottom: 0`) of this sticky container, they will be rendered in the clipped region and appear completely invisible.

### The Fix

When calculating screen-space bounds for inner children, account for the physical pixels of the border (`borderWidth * zoom`). Adjust the outer rect to get the true inner content rect on screen:

```typescript
const borderPhysicalPx = borderWidth * zoom;

const nodeContentTopInScreen = nodeRect.top + borderPhysicalPx - parentRect.top;
const nodeContentBottomInScreen = nodeRect.bottom - borderPhysicalPx - parentRect.top;
const nodeContentLeftInScreen = nodeRect.left + borderPhysicalPx - parentRect.left;
const nodeContentRightInScreen = nodeRect.right - borderPhysicalPx - parentRect.left;
```

This ensures the sticky container matches the exact dimensions of the content area and fits perfectly without being clipped by the parent's `overflow: hidden`.

**Counter-scaled borders:** when the node border is written as `3 / zoom` px (constant thickness on screen), `borderInset` must still be **3 screen pixels** — not `3 / zoom`. Using node-local px in a `getBoundingClientRect()` adjustment shrinks the inset as zoom rises; the sticky layer then spans into the border band and right/bottom overlays (custom L2 scroll thumbs) vanish. Partial viewport clamping can mask this because the visible slice is already narrower than the full box.
