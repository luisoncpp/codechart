/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ReactFlowProvider, useStoreApi } from "@xyflow/react";
import type { GraphSessionStore } from "../src/state/graph-session";
import { readyGraphStore } from "./helpers/flow-graph-canvas";
import { renderCanvasWithGroup } from "./helpers/graph-canvas-dom";
import { GroupDescription } from "../src/features/graph_canvas/Private/descriptions/GroupDescription";

/** GroupDescription reads React Flow's store (viewport dismissal), so direct
 *  renders need the provider. `setViewport` needs a mounted `<ReactFlow>`
 *  (panZoom instance), so panning is simulated by writing the store transform
 *  directly — the same state a real pan mutates. */
function renderDescription(
  data: Parameters<typeof GroupDescription>[0]["data"],
  flow?: { pan?: (x: number, y: number) => void },
) {
  function CaptureFlow() {
    const store = useStoreApi();
    if (flow) flow.pan = (x, y) => store.setState({ transform: [x, y, 1] });
    return null;
  }
  return render(
    <ReactFlowProvider>
      <CaptureFlow />
      <GroupDescription data={data} descColor="#1e293b" />
    </ReactFlowProvider>,
  );
}

const CORE_SHORT = "Domain types & state";
const CORE_LONG =
  "Domain model and in-memory state for todos. Pure logic with no I/O or UI. " +
  "Code outside this group must go through the facade (index.ts); store, todo, and validate are private.";

describe("group description tooltip (L1)", () => {
  let store: GraphSessionStore;
  beforeEach(async () => {
    store = await readyGraphStore();
  });

  it("hovering the short description shows the long description in a custom tooltip", async () => {
    const { group } = await renderCanvasWithGroup(store, "core");
    const short = within(group as HTMLElement).getByText(CORE_SHORT);
    fireEvent.mouseEnter(short, { clientX: 120, clientY: 80 });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(CORE_LONG);
    // Portaled to body + fixed: screen-space, never clipped or zoom-scaled.
    expect(tooltip.parentElement).toBe(document.body);
    expect(tooltip.style.position).toBe("fixed");
  });

  it("leaving the description hides the tooltip", async () => {
    const { group } = await renderCanvasWithGroup(store, "core");
    const short = within(group as HTMLElement).getByText(CORE_SHORT);
    fireEvent.mouseEnter(short, { clientX: 120, clientY: 80 });
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.mouseLeave(short);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows no tooltip at L1.5+ where the long description is already inline", () => {
    renderDescription({
      label: "core",
      color: "#64748b",
      descriptionShort: CORE_SHORT,
      descriptionLong: CORE_LONG,
      showLong: true,
      descriptionBox: { x: 0, y: 0, width: 200, height: 60 },
    });
    const inline = screen.getByText(CORE_LONG);
    fireEvent.mouseEnter(inline, { clientX: 120, clientY: 80 });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows no tooltip when the long description equals the displayed short one", () => {
    renderDescription({
      label: "core",
      color: "#64748b",
      descriptionShort: CORE_SHORT,
      descriptionLong: CORE_SHORT,
      descriptionBox: { x: 0, y: 0, width: 200, height: 60 },
    });
    const short = screen.getByText(CORE_SHORT);
    fireEvent.mouseEnter(short, { clientX: 120, clientY: 80 });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows no tooltip when long and short differ only in whitespace", () => {
    // Regression: a CRLF-authored body once made the short fallback equal the
    // whole body except newlines-vs-spaces — visually identical, so redundant.
    renderDescription({
      label: "core",
      color: "#64748b",
      descriptionShort: "First line. Second line.",
      descriptionLong: "First line.\r\n\r\nSecond line.\r\n",
      descriptionBox: { x: 0, y: 0, width: 200, height: 60 },
    });
    const short = screen.getByText("First line. Second line.");
    fireEvent.mouseEnter(short, { clientX: 120, clientY: 80 });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("dismisses an open tooltip when the canvas viewport pans", () => {
    const flow: { pan?: (x: number, y: number) => void } = {};
    renderDescription(
      {
        label: "core",
        color: "#64748b",
        descriptionShort: CORE_SHORT,
        descriptionLong: CORE_LONG,
        descriptionBox: { x: 0, y: 0, width: 200, height: 60 },
      },
      flow,
    );
    const short = screen.getByText(CORE_SHORT);
    fireEvent.mouseEnter(short, { clientX: 120, clientY: 80 });
    expect(screen.getByRole("tooltip")).toBeTruthy();
    act(/*panCanvas*/ () => flow.pan!(40, 0));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders markdown elements inside the tooltip", () => {
    renderDescription({
      label: "core",
      color: "#64748b",
      descriptionShort: "Short label",
      descriptionLong: "This is **bold** text with `inline code` and a [link](https://example.com).",
      descriptionBox: { x: 0, y: 0, width: 200, height: 60 },
    });
    const short = screen.getByText("Short label");
    fireEvent.mouseEnter(short, { clientX: 120, clientY: 80 });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.querySelector("strong")).toHaveTextContent("bold");
    expect(tooltip.querySelector("code")).toHaveTextContent("inline code");
    expect(tooltip.querySelector("a")).toHaveAttribute("href", "https://example.com");
  });

  it("renders inline wiki links without flex layout on paragraph", () => {
    const textWithLink =
      "Fastify plugin serving battler [[BattlerBodySchema]] declares every writable field";
    const { container } = renderDescription({
      label: "battlers",
      color: "#ef4444",
      descriptionShort: textWithLink,
      descriptionBox: { x: 0, y: 0, width: 240, height: 100 },
    });
    const p = container.querySelector("p");
    expect(p).not.toBeNull();
    expect(p?.style.display).not.toBe("flex");
    const link = p?.querySelector("a.hl-wiki-link");
    expect(link).not.toBeNull();
    expect(link).toHaveTextContent("BattlerBodySchema");
  });
});

