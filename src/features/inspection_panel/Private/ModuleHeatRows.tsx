// @Architecture(descriptionShort="Qualitative heat metric rows for module inspection")
import type { ModuleNode } from "../../../domain/graph";
import {
  computeHeatProjection,
  formatChurn,
  heatBand,
  rawHeatValue,
} from "../../../domain/graph";
import type { ProjectGraph } from "../../../domain/graph";
import { isTestModule } from "../../../domain/graph";
import { Row } from "./PanelParts";

export function ModuleHeatRows({
  graph,
  module,
  hideTests,
}: {
  graph: ProjectGraph;
  module: ModuleNode;
  hideTests: boolean;
}) {
  const hasMetrics =
    module.metrics.churn !== undefined || module.metrics.bugRisk !== undefined;
  if (!hasMetrics) return null;

  const moduleIds = new Set(
    graph.modules
      .filter((m) => !hideTests || !isTestModule(m.path))
      .map((m) => m.id),
  );
  const activity = computeHeatProjection(graph, "activity", moduleIds);
  const risk = computeHeatProjection(graph, "risk", moduleIds);
  const actScore = activity.modules.get(module.id)?.score;
  const riskScore = risk.modules.get(module.id)?.score;

  return (
    <>
      <Row
        label="Activity (90d)"
        value={`${heatBand(actScore)} · churn ${formatChurn(module.metrics.churn)}`}
      />
      <Row
        label="Bug risk (90d)"
        value={`${heatBand(riskScore)} · ${module.metrics.fixCommits ?? 0} fix commits`}
      />
    </>
  );
}

/** Whether a module carries git-derived heat metrics. */
export function moduleHasHeatMetrics(module: ModuleNode): boolean {
  return rawHeatValue(module, "activity") !== undefined
    || rawHeatValue(module, "risk") !== undefined;
}
