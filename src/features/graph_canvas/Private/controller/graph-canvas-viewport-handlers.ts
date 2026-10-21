import { levelFromZoom } from "../../../../domain/graph";
import type { GraphSessionStore } from "../../../../state/graph-session";

export class GraphCanvasViewportHandlers {
  constructor(private store: GraphSessionStore) {}

  onPaneClick() {
    this.store.select(null);
  }

  /** Scroll-zoom drives the discrete detail level (guarded against no-ops). */
  onViewportZoom(zoom: number) {
    const currentLevel = this.store.getZoomLevel();
    this.store.setZoomLevel(levelFromZoom(zoom, { currentLevel }));
  }
}
