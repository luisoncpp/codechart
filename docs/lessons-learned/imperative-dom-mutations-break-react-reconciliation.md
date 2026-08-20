# Imperative DOM child mutations inside React components cause removeChild crashes

## What is counter-intuitive

Mutating a DOM element's children (e.g. `while (group.firstChild) group.removeChild(group.firstChild)` or `group.appendChild(...)`) when that element is also rendered with React child elements creates a race condition with React's Fiber reconciler.

When React subsequently updates or unmounts the component, its commit phase attempts to clean up its old Fiber DOM children by calling `parent.removeChild(child)`. Because the imperative code already detached or replaced those nodes in the real DOM, `child.parentNode !== parent`, causing `Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node'` and unmounting the entire React root (white screen of death).

## Safe pattern

- **Attributes on leaf elements (`<path ref={strokeRef} />`):** `setAttribute("d", ...)` on a leaf DOM node without React-managed children is safe because it alters attributes without detaching nodes from the tree.
- **Children (`<g ref={arrowRef}>{...}</g>`):** Let React manage child element lifecycles declaratively through component props and state (e.g. `bucket.arrowSegments.map(...)` controlled by `showArrows`). Never imperatively remove or append children to containers managed by React JSX.
