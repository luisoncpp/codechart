import { AnalysisClient } from "../../../ipc/analysis-client";
import { ProjectGraph } from "../../../domain/graph";
import { EventEmitter } from "./event-emitter";

export type SessionPhase = "idle" | "loading" | "ready" | "failed" | "empty";

export class GraphSessionStore extends EventEmitter {
  private phase: SessionPhase = "idle";
  private graph: ProjectGraph | null = null;
  private error: string | null = null;

  constructor(private client: AnalysisClient) {
    super();
  }

  getPhase(): SessionPhase {
    return this.phase;
  }

  getGraph(): ProjectGraph | null {
    return this.graph;
  }

  getError(): string | null {
    return this.error;
  }

  async loadProject(path: string) {
    this.phase = "loading";
    this.error = null;
    this.emit("phase-changed");

    try {
      const result = await this.client.analyzeProject(path);
      this.graph = result;
      this.phase = result.modules.length === 0 ? "empty" : "ready";
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.phase = "failed";
    }

    this.emit("phase-changed");
  }
}
