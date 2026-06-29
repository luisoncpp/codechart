import { describe, expect, it } from "vitest";
import { tokenizeCode } from "../src/features/graph_canvas/Private/highlighter";

describe("tokenizeCode", () => {
  it("tokenizes TypeScript code correctly", () => {
    const code = `
      // a comment
      export class MyClass {
        @decorator
        myMethod() {
          const val = "string";
          return 42;
        }
      }
    `.trim();

    const lines = tokenizeCode(code, "test.ts");
    expect(lines.length).toBeGreaterThan(0);

    // Look for comment
    const commentLine = lines[0];
    expect(commentLine.some((t) => t.type === "comment" && t.text.includes("a comment"))).toBe(true);

    // Look for class keyword and MyClass type
    const classLine = lines[1];
    expect(classLine.some((t) => t.type === "keyword" && t.text === "class")).toBe(true);
    expect(classLine.some((t) => t.type === "type" && t.text === "MyClass")).toBe(true);

    // Look for decorator
    const decLine = lines[2];
    expect(decLine.some((t) => t.type === "decorator" && t.text === "@decorator")).toBe(true);

    // Look for function name and parenthesis (operator/punctuation)
    const methodLine = lines[3];
    expect(methodLine.some((t) => t.type === "function" && t.text === "myMethod")).toBe(true);

    // Look for string
    const stringLine = lines[4];
    expect(stringLine.some((t) => t.type === "string" && t.text === '"string"')).toBe(true);

    // Look for number
    const numLine = lines[5];
    expect(numLine.some((t) => t.type === "number" && t.text === "42")).toBe(true);
  });

  it("tokenizes Rust code correctly", () => {
    const code = `
      fn main() {
        let msg = r#"hello"#;
        println!("Message: {}", msg);
      }
    `.trim();

    const lines = tokenizeCode(code, "main.rs");

    // Look for fn keyword
    expect(lines[0].some((t) => t.type === "keyword" && t.text === "fn")).toBe(true);

    // Look for raw string r#"hello"#
    expect(lines[1].some((t) => t.type === "string" && t.text === 'r#"hello"#')).toBe(true);

    // Look for println! macro
    expect(lines[2].some((t) => t.type === "macro" && t.text === "println!")).toBe(true);
  });

  it("tokenizes Python code correctly", () => {
    const code = `
      # python comment
      @my_decorator
      def my_func():
        """docstring"""
        return None
    `.trim();

    const lines = tokenizeCode(code, "script.py");

    expect(lines[0].some((t) => t.type === "comment" && t.text === "# python comment")).toBe(true);
    expect(lines[1].some((t) => t.type === "decorator" && t.text === "@my_decorator")).toBe(true);
    expect(lines[3].some((t) => t.type === "string" && t.text === '"""docstring"""')).toBe(true);
    expect(lines[4].some((t) => t.type === "keyword" && t.text === "None")).toBe(true);
  });

  it("tokenizes Go code correctly", () => {
    const code = `
      package main
      func main() {
        x := make([]int, 0)
      }
    `.trim();

    const lines = tokenizeCode(code, "main.go");

    expect(lines[0].some((t) => t.type === "keyword" && t.text === "package")).toBe(true);
    expect(lines[1].some((t) => t.type === "keyword" && t.text === "func")).toBe(true);
    expect(lines[2].some((t) => t.type === "operator" && t.text === ":=")).toBe(true);
    expect(lines[2].some((t) => t.type === "builtin" && t.text === "make")).toBe(true);
  });

  it("tokenizes CSS code correctly", () => {
    const code = `
      /* canvas chrome */
      @import url("./tokens.css");
      .react-flow__node-module { overflow: hidden; }
    `.trim();

    const lines = tokenizeCode(code, "graph-canvas.css");
    expect(lines[0].some((t) => t.type === "comment")).toBe(true);
    expect(lines[1].some((t) => t.type === "keyword" && t.text === "@import")).toBe(true);
    expect(lines[2].some((t) => t.type === "selector" && t.text === ".react-flow__node-module")).toBe(
      true,
    );
  });

  it("tokenizes unknown file using default fallback rules", () => {
    const code = `
      let x = "fallback";
    `.trim();

    const lines = tokenizeCode(code, "unknown.xyz");
    expect(lines[0].some((t) => t.type === "keyword" && t.text === "let")).toBe(true);
    expect(lines[0].some((t) => t.type === "string" && t.text === '"fallback"')).toBe(true);
  });

  it("splits empty lines correctly", () => {
    const code = "one\n\ntwo";
    const lines = tokenizeCode(code, "test.ts");
    expect(lines.length).toBe(3);
    expect(lines[0].some((t) => t.text === "one")).toBe(true);
    expect(lines[1].length).toBe(0); // empty line
    expect(lines[2].some((t) => t.text === "two")).toBe(true);
  });
});
