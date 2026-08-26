import { describe, expect, it, vi } from "vitest";
import {
  copyMenuClipboardText,
  formatCopyWithContext,
} from "../src/features/graph_canvas/Private/preview_frames/copy-with-context";
import { selectionLineRange } from "../src/features/graph_canvas/Private/preview_frames/selection-line-range";
import { captureCopyMenu } from "../src/features/graph_canvas/Private/preview_frames/use-frame-copy-menu";

describe("formatCopyWithContext", () => {
  it("wraps the snippet in a start:end:path fence", () => {
    expect(
      formatCopyWithContext({
        path: "src/mod.ts",
        startLine: 2,
        endLine: 4,
        snippet: "function bar() {\n  return foo;\n}",
      }),
    ).toBe("```2:4:src/mod.ts\nfunction bar() {\n  return foo;\n}\n```");
  });

  it("keeps a single-line selection as start:end", () => {
    expect(
      formatCopyWithContext({
        path: "src/mod.ts",
        startLine: 12,
        endLine: 12,
        snippet: "const foo = 1;",
      }),
    ).toBe("```12:12:src/mod.ts\nconst foo = 1;\n```");
  });

  it("orders a reversed range and lengthens the fence when the snippet contains ticks", () => {
    expect(
      formatCopyWithContext({
        path: "a.ts",
        startLine: 5,
        endLine: 3,
        snippet: "```js\nok\n```",
      }),
    ).toBe("````3:5:a.ts\n```js\nok\n```\n````");
  });
});

describe("copyMenuClipboardText", () => {
  const captured = {
    path: "src/mod.ts",
    snippet: "foo()",
    startLine: 2,
    endLine: 2,
  };

  it("returns the snippet for Copy and a fence for Copy with context", () => {
    expect(copyMenuClipboardText(captured, /*kind=*/"plain")).toBe("foo()");
    expect(copyMenuClipboardText(captured, /*kind=*/"context")).toBe("```2:2:src/mod.ts\nfoo()\n```");
  });

  it("returns null when there is no snippet, or no line range for context", () => {
    expect(copyMenuClipboardText({ ...captured, snippet: "" }, /*kind=*/"plain")).toBeNull();
    expect(copyMenuClipboardText({ ...captured, startLine: null }, /*kind=*/"context")).toBeNull();
  });
});

describe("selectionLineRange", () => {
  it("reads inclusive 1-based lines from data-line ancestors", () => {
    const host = mount(
      '<div data-line="4"><span id="a">one</span></div>' +
        '<div data-line="7"><span id="b">two</span></div>',
    );
    selectAcross(host.querySelector("#a")!, host.querySelector("#b")!);
    expect(selectionLineRange(window.getSelection())).toEqual({ startLine: 4, endLine: 7 });
  });

  it("returns null when the selection is collapsed or off a source row", () => {
    const host = mount('<p id="desc">prose</p><div data-line="1"><span>code</span></div>');
    const desc = host.querySelector("#desc")!;
    selectNode(desc);
    expect(selectionLineRange(window.getSelection())).toBeNull();
    window.getSelection()?.collapseToStart();
    expect(selectionLineRange(window.getSelection())).toBeNull();
  });
});

describe("captureCopyMenu", () => {
  it("snapshots the live selection and line range", () => {
    const host = mount('<div data-line="2"><span>hello</span></div>');
    selectNode(host.querySelector("span")!);
    const preventDefault = vi.fn();
    const event = {
      preventDefault,
      stopPropagation: vi.fn(),
      clientX: 8,
      clientY: 9,
    } as unknown as React.MouseEvent;
    expect(captureCopyMenu(event, "src/a.ts")).toEqual({
      x: 8,
      y: 9,
      path: "src/a.ts",
      snippet: "hello",
      startLine: 2,
      endLine: 2,
    });
    expect(preventDefault).toHaveBeenCalled();
  });
});

function mount(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

function selectNode(el: Element) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

function selectAcross(start: Element, end: Element) {
  const range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, end.childNodes.length);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}
