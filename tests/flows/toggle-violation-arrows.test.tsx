import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "../helpers/flow-graph-canvas";
import { styleEdges } from "../../src/features/graph_canvas/Private/edges/edge-style";
import type { RFEdgeT } from "../../src/domain/projection";

function edge(id: string, data: RFEdgeT["data"]): RFEdgeT {
  return { id, source: "a", target: "b", data };
}

const violation = edge("v", { isViolation: true, kind: "import" });
const plain = edge("p", { isViolation: false, kind: "import" });
const diffViolation = edge("d", { isViolation: true, kind: "import", diffState: "added" });

/** Flow: View ▸ Arrow visibility ▸ Show violation arrows (on by default). */
describe("flow: toggle violation arrows", () => {
  it("keeps violation edges while the option is on", () => {
    const ids = styleEdges([violation, plain], null, {
      arrowVisibility: "all",
      showViolationArrows: true,
    }).map((e) => e.id);
    expect(ids).toEqual(["v", "p"]);
  });

  it("drops violation edges when off, even when they touch the selection", () => {
    const ids = styleEdges([violation, plain, diffViolation], "a", {
      arrowVisibility: "all",
      showViolationArrows: false,
    }).map((e) => e.id);
    expect(ids).toEqual(["p", "d"]);
  });

  it("menu checkbox is checked by default and toggles CanvasUiState", async () => {
    const store = await readyGraphStore();
    const { canvasUi } = renderGraphCanvas(store);
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    const submenuTrigger = screen.getByRole("menuitem", { name: /Arrow visibility/ });
    fireEvent.mouseEnter(submenuTrigger.parentElement!);

    const item = screen.getByRole("menuitemcheckbox", { name: "Show violation arrows (red)" });
    expect(item).toHaveAttribute("aria-checked", "true");

    fireEvent.click(item);
    expect(canvasUi.getShowViolationArrows()).toBe(false);
    expect(item).toHaveAttribute("aria-checked", "false");
  });
});
