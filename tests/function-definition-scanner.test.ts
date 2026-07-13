import { describe, expect, it } from "vitest";
import { scanFunctionDefinitions } from "../src/features/graph_canvas/Private/preview_frames/function-definition-scanner";

const TS_SOURCE = [
  'import { helper } from "./other";', // 0
  "", // 1
  "export class Store {", // 2
  "  async fetchModuleSource(moduleId: string): Promise<string> {", // 3
  "    return doFetch(moduleId);", // 4
  "  }", // 5
  "", // 6
  "  private resolveTarget(", // 7
  "    name: string,", // 8
  "  ) {", // 9
  "    setThing(name);", // 10
  "  }", // 11
  "}", // 12
  "", // 13
  "export async function makeStore(root: string) {", // 14
  "  useEffect(() => {", // 15
  '    describe("x", () => {', // 16
  "  if (root) {", // 17
  "  return open(root)", // 18
  "}", // 19
].join("\n");

describe("scanFunctionDefinitions (TypeScript)", () => {
  const defs = scanFunctionDefinitions(TS_SOURCE);

  it("finds class methods with modifiers", () => {
    expect(defs.get("fetchModuleSource")).toBe(3);
  });

  it("finds a multi-line signature behind a modifier prefix", () => {
    expect(defs.get("resolveTarget")).toBe(7);
  });

  it("finds declared functions", () => {
    expect(defs.get("makeStore")).toBe(14);
  });

  it("skips calls, callbacks, control flow, and string-arg calls", () => {
    expect(defs.has("doFetch")).toBe(false);
    expect(defs.has("setThing")).toBe(false);
    expect(defs.has("useEffect")).toBe(false);
    expect(defs.has("describe")).toBe(false);
    expect(defs.has("if")).toBe(false);
    expect(defs.has("open")).toBe(false);
  });

  it("skips declaration-only signatures ending in a semicolon", () => {
    const defs = scanFunctionDefinitions("onNavigate(id: number): void;");
    expect(defs.size).toBe(0);
  });

  it("keeps the first occurrence on duplicate names", () => {
    const defs = scanFunctionDefinitions("function twice() {\n}\nfunction twice() {\n}");
    expect(defs.get("twice")).toBe(0);
  });
});

const RUST_SOURCE = [
  "pub struct Builder;", // 0
  "impl Builder {", // 1
  "    pub fn new(root: &str) -> Self {", // 2
  "        Self::init(root)", // 3
  "    }", // 4
  "    fn helper(count: usize) -> usize {", // 5
  "        count + 1", // 6
  "    }", // 7
  "}", // 8
].join("\n");

describe("scanFunctionDefinitions (Rust)", () => {
  const defs = scanFunctionDefinitions(RUST_SOURCE);

  it("finds pub and private fn definitions", () => {
    expect(defs.get("new")).toBe(2);
    expect(defs.get("helper")).toBe(5);
  });

  it("skips path calls in tail expressions", () => {
    expect(defs.has("init")).toBe(false);
  });
});

const CPP_SOURCE = [
  '#include "graph.h"', // 0
  "", // 1
  "void GraphBuilder::addNode(Node node) {", // 2
  "  nodes.push_back(node);", // 3
  "}", // 4
  "", // 5
  "int GraphBuilder::countNodes() const {", // 6
  "  return nodes.size();", // 7
  "}", // 8
  "", // 9
  "static int localHelper(int a, int b) {", // 10
  "  return a + b;", // 11
  "}", // 12
  "", // 13
  "FWorldConditionResult FSmartObjectWorldConditionInteractQuery::IsTrue(const FWorldConditionContext& Context) const", // 14
  "{", // 15
  "  return Result;", // 16
  "}", // 17
].join("\n");

describe("scanFunctionDefinitions (C++)", () => {
  const defs = scanFunctionDefinitions(CPP_SOURCE);

  it("finds qualified out-of-class definitions", () => {
    expect(defs.get("addNode")).toBe(2);
    expect(defs.get("countNodes")).toBe(6);
    expect(defs.get("IsTrue")).toBe(14);
  });

  it("finds free functions with return types", () => {
    expect(defs.get("localHelper")).toBe(10);
  });

  it("skips member calls", () => {
    expect(defs.has("push_back")).toBe(false);
  });
});
