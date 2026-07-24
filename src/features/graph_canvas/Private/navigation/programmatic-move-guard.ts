// @Architecture(descriptionShort="Keeps preview frames open across programmatic canvas moves")

/**
 * Marks a programmatic canvas move (a `focusOn` pan) so preview frames survive
 * it; user pans still dismiss frames. React Flow fires the same move handlers
 * for both — the event is `null` only for programmatic camera writes. See
 * docs/lessons-learned/programmatic-canvas-moves-trigger-move-handlers.md.
 */
export class ProgrammaticMoveGuard {
  private keepPreview = false;

  begin = () => {
    this.keepPreview = true;
  };

  shouldClosePreview = (event: MouseEvent | TouchEvent | null) =>
    event !== null || !this.keepPreview;

  finishMove = () => {
    this.keepPreview = false;
  };
}
