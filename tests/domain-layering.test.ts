import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Regression guard for the three-way deep-module cycle between `domain/graph`,
 * `domain/diff` and `domain/layout` (a `circularDependency` diagnostic from
 * `codechart-cli check`). The domain is layered strictly:
 *
 *   graph  →  (nothing)
 *   layout →  graph
 *   diff   →  graph
 *   projection → graph, layout, diff
 *
 * Any new import that points "down" this list re-creates the cycle.
 */
const ALLOWED: Record<string, readonly string[]> = {
  graph: [],
  layout: ["graph"],
  diff: ["graph"],
  projection: ["graph", "layout", "diff"],
};

const DOMAIN_ROOT = path.join(process.cwd(), "src", "domain");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(/*collect*/ (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Sibling domain modules referenced by this file's relative imports. */
function importedDomains(file: string, source: string): string[] {
  const fromDir = path.dirname(file);
  const found = new Set<string>();
  for (const match of source.matchAll(/from\s+"(\.[^"]*)"/g)) {
    const resolved = path.resolve(fromDir, match[1]);
    const rel = path.relative(DOMAIN_ROOT, resolved).split(path.sep);
    if (rel[0] && rel[0] !== "..") found.add(rel[0]);
  }
  return [...found];
}

describe("domain module layering", () => {
  const owners = fs
    .readdirSync(DOMAIN_ROOT, { withFileTypes: true })
    .filter(/*directories only*/ (entry) => entry.isDirectory())
    .map(/*name*/ (entry) => entry.name);

  it("declares an expectation for every domain module", () => {
    expect(owners.sort()).toEqual(Object.keys(ALLOWED).sort());
  });

  for (const owner of owners) {
    it(`${owner} imports only ${ALLOWED[owner].join(", ") || "nothing"}`, () => {
      const violations: string[] = [];
      for (const file of sourceFiles(path.join(DOMAIN_ROOT, owner))) {
        const source = fs.readFileSync(file, "utf8");
        for (const target of importedDomains(file, source)) {
          if (target === owner || ALLOWED[owner].includes(target)) continue;
          violations.push(`${path.relative(DOMAIN_ROOT, file)} → ${target}`);
        }
      }
      expect(violations).toEqual([]);
    });
  }
});
