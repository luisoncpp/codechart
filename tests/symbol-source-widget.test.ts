import { describe, expect, it } from "vitest";
import { findSymbolLine } from "../src/features/graph_canvas/Private/SymbolSourceWidget";

const SOURCE_MOCK = `
import { something } from "./other";

export interface ITodo {
  id: string;
}

export class TodoStore implements ITodo {
  id = "1";
}

function makeTodo(name: string) {
  return { id: "2" };
}

export const MAX_TODOS = 10;

export default function renderApp() {
  console.log("App");
}
`;

describe("findSymbolLine", () => {
  it("finds interface definitions", () => {
    expect(findSymbolLine(SOURCE_MOCK, "ITodo")).toBe(3);
  });

  it("finds class definitions", () => {
    expect(findSymbolLine(SOURCE_MOCK, "TodoStore")).toBe(7);
  });

  it("finds function definitions", () => {
    expect(findSymbolLine(SOURCE_MOCK, "makeTodo")).toBe(11);
  });

  it("finds const definitions", () => {
    expect(findSymbolLine(SOURCE_MOCK, "MAX_TODOS")).toBe(15);
  });

  it("finds default export definitions", () => {
    expect(findSymbolLine(SOURCE_MOCK, "default")).toBe(17);
  });

  it("falls back to 0 if not found", () => {
    expect(findSymbolLine(SOURCE_MOCK, "UNKNOWN")).toBe(0);
  });
});
