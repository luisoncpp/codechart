import { describe, expect, it } from "vitest";
import { inferSymbolKind } from "../src/domain/graph";

describe("inferSymbolKind", () => {
  it("classifies React components in .tsx modules", () => {
    expect(inferSymbolKind("App", "tsx")).toBe("component");
    expect(inferSymbolKind("TodoList", "tsx")).toBe("component");
  });

  it("classifies interfaces, types, and classes in .ts modules", () => {
    expect(inferSymbolKind("ITodoStore", "typescript")).toBe("interface");
    expect(inferSymbolKind("ApiResult", "typescript")).toBe("type");
    expect(inferSymbolKind("Todo", "typescript")).toBe("type");
    expect(inferSymbolKind("TodoStore", "typescript")).toBe("class");
  });

  it("classifies hooks, predicates, and functions", () => {
    expect(inferSymbolKind("useTodos", "tsx")).toBe("hook");
    expect(inferSymbolKind("isValid", "typescript")).toBe("predicate");
    expect(inferSymbolKind("getJson", "typescript")).toBe("function");
    expect(inferSymbolKind("makeTodo", "typescript")).toBe("function");
  });

  it("handles default and constant exports", () => {
    expect(inferSymbolKind("default", "typescript")).toBe("default");
    expect(inferSymbolKind("MAX_RETRIES", "typescript")).toBe("constant");
  });
});
