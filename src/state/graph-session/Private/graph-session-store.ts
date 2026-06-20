import { AnalysisClient } from "../../../ipc/analysis-client";
import { ProjectGraph } from "../../../domain/graph";
import { LayoutEngine, LayoutedGraph } from "../../../domain/layout";
import { EventEmitter } from "./event-emitter";

export type SessionPhase = "idle" | "loading" | "ready" | "failed" | "empty";

export class GraphSessionStore extends EventEmitter {
  private phase: SessionPhase = "idle";
  private graph: ProjectGraph | null = null;
  private layout: LayoutedGraph | null = null;
  private error: string | null = null;
  private selectedId: string | null = null;

  constructor(
    private client: AnalysisClient,
    private layoutEngine: LayoutEngine,
  ) {
    super();
  }

  getPhase(): SessionPhase {
    return this.phase;
  }

  getGraph(): ProjectGraph | null {
    return this.graph;
  }

  getLayout(): LayoutedGraph | null {
    return this.layout;
  }

  getError(): string | null {
    return this.error;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  select(id: string | null) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.emit("selection-changed");
  }

  async loadProject(path: string) {
    this.phase = "loading";
    this.error = null;
    this.selectedId = null;
    this.emit("phase-changed");

    try {
      const graph = await this.client.analyzeProject(path);
      this.graph = graph;
      if (graph.modules.length === 0) {
        this.layout = null;
        this.phase = "empty";
      } else {
        this.layout = await this.layoutEngine.layout(graph);
        this.phase = "ready";
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.phase = "failed";
    }

    this.emit("phase-changed");
  }
}
