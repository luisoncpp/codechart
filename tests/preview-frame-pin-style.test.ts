import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(process.cwd(), "src/features/graph_canvas/Private/graph-canvas.css"),
  "utf8",
);

function readFilter(selector: string): string {
  const rule = styles.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
  if (!rule) throw new Error(`Missing CSS rule for ${selector}`);

  const filter = rule[1].match(/filter:\s*([^;]+)/);
  if (!filter) throw new Error(`Missing filter declaration for ${selector}`);
  return filter[1].trim();
}

describe("preview-frame pin affordance", () => {
  it("keeps an unpinned hover softer than the vivid pinned state", () => {
    const transientHover = readFilter(".symbol-widget__pin:hover");
    const pinned = readFilter(".symbol-widget__pin--active:hover");

    expect(transientHover).toBe("saturate(0.5)");
    expect(pinned).toBe("none");
  });
});
