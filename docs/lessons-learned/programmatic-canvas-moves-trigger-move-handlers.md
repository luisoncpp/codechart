# Programmatic canvas moves trigger move handlers

React Flow calls `onMoveStart` and `onMoveEnd` for camera commands such as `setCenter`, not only for pointer-driven pan and zoom. A navigation flow that opens an overlay and centers the canvas can therefore close its own overlay when the general move-start behavior dismisses previews.

Keep dismissal scoped to user movement, or mark the specific programmatic focus that must preserve its resulting UI and clear that marker on move end. In Review Note navigation, a ref preserves the preview only during the move that centers its owning module; pointer events still dismiss previews normally.
