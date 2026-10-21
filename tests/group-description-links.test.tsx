/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { GroupDescription } from "../src/features/graph_canvas/Private/descriptions/GroupDescription";
import { resolveWikiPath, wikiLinkFromEvent } from "../src/features/graph_canvas/Private/wiki_links";

type Data = Parameters<typeof GroupDescription>[0]["data"];

function renderDescription(data: Partial<Data>) {
  return render(
    <ReactFlowProvider>
      <GroupDescription
        data={{ label: "sim", color: "#0ea5e9", descriptionBox: { x: 0, y: 0, width: 300, height: 120 }, ...data }}
        descColor="#1e293b"
      />
    </ReactFlowProvider>,
  );
}

const LONG =
  "Headless simulator.\n\nDesign: [the doc](../../docs/architecture/sim.md).";

// Regression (typerpg `character-sim.group.md`): at L1.5 the inline long text was
// `pointer-events: none`, so the click fell through to the group, and with no
// linking file `../../docs/…` escaped the root and resolved to nothing.
describe("links in a group description", () => {
  it("are clickable at L1.5 and resolve against the group's *.group.md", () => {
    renderDescription({
      descriptionLong: LONG,
      showLong: true,
      configPath: "scripts/character-sim/character-sim.group.md",
    });
    const link = screen.getByText("the doc");
    expect(link.closest("p")).toHaveStyle({ pointerEvents: "auto" });
    const click = wikiLinkFromEvent(link)!;
    expect(resolveWikiPath(click.target, click.fromPath)).toBe("docs/architecture/sim.md");
  });

  it("stay inert when the text has no link and no tooltip", () => {
    renderDescription({ descriptionLong: "Plain prose.", showLong: true });
    expect(screen.getByText("Plain prose.").closest("p")).toHaveStyle({ pointerEvents: "none" });
  });
});
