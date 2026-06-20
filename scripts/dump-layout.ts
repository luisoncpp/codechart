/**
 * Dev checkpoint script: lays out the golden model and writes an SVG so the
 * geometry (nesting + non-overlap) can be eyeballed.
 *
 * Run: npx vite-node scripts/dump-layout.ts [out.svg]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ElkLayoutEngine } from "../src/domain/layout";
import type { LayoutBox, LayoutedGraph } from "../src/domain/layout";
import type { ProjectGraph } from "../src/domain/graph";

const here = dirname(fileURLToPath(import.meta.url));
const goldenPath = resolve(here, "../tests/fixtures/golden/project-graph.json");
const outPath = resolve(here, "..", process.argv[2] ?? "layout-dump.svg");

function rect(box: LayoutBox, fill: string, stroke: string): string {
  const label = box.id.split("/").pop() ?? box.id;
  return (
    `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" ` +
    `fill="${fill}" stroke="${stroke}" rx="6"/>` +
    `<text x="${box.x + 6}" y="${box.y + 16}" font-size="11" font-family="sans-serif">${label}</text>`
  );
}

function toSvg(g: LayoutedGraph): string {
  const groups = g.groups.map((b) => rect(b, "rgba(80,120,200,0.12)", "#5078c8")).join("\n");
  const modules = g.modules.map((b) => rect(b, "#ffffff", "#888")).join("\n");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}" ` +
    `viewBox="0 0 ${g.width} ${g.height}">\n${groups}\n${modules}\n</svg>\n`
  );
}

const graph = JSON.parse(readFileSync(goldenPath, "utf8")) as ProjectGraph;
const layouted = await new ElkLayoutEngine().layout(graph);
writeFileSync(outPath, toSvg(layouted));
console.log(
  `Wrote ${outPath} — ${layouted.groups.length} groups, ${layouted.modules.length} modules, ` +
    `${layouted.width}x${layouted.height}`,
);
