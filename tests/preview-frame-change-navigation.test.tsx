/// <reference types="@testing-library/jest-dom" />
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computeLineDiff } from "../src/domain/diff";
import { renderPreviewFrame } from "./helpers/render-preview-frame";

const ROW_HEIGHT = 20;
const BODY_HEIGHT = 100;
const AFTER = Array.from({ length: 30 }, (_, i) => `line${i + 1}`);
// Two change blocks: line 8 replaced, line 25 added.
const BEFORE = AFTER.map((text, i) => (i === 7 ? "old8" : text)).filter((_, i) => i !== 24);

function renderDiffFrame(withDiff: boolean) {
  const fileDiff = withDiff ? computeLineDiff(BEFORE.join("\n"), AFTER.join("\n")) : undefined;
  return renderPreviewFrame({ symbolName: null, sourceText: AFTER.join("\n") }, fileDiff);
}

/** Lay rows out at ROW_HEIGHT each inside a BODY_HEIGHT viewport (jsdom has no layout). */
function stubLayout(container: HTMLElement) {
  const body = container.querySelector<HTMLElement>(".symbol-widget__body")!;
  const rows = Array.from(body.querySelectorAll<HTMLElement>(".symbol-widget__line"));
  Object.defineProperty(body, "clientHeight", { value: BODY_HEIGHT });
  Object.defineProperty(body, "offsetHeight", { value: BODY_HEIGHT });
  body.getBoundingClientRect = () => ({ top: 0, height: BODY_HEIGHT }) as DOMRect;
  rows.forEach((row, i) => {
    row.getBoundingClientRect = () =>
      ({ top: i * ROW_HEIGHT - body.scrollTop, height: ROW_HEIGHT }) as DOMRect;
  });
  return { body, rows };
}

/** Text of the row whose midpoint sits at the body center. */
function centeredText(body: HTMLElement, rows: readonly HTMLElement[]): string {
  const index = (body.scrollTop + BODY_HEIGHT / 2 - ROW_HEIGHT / 2) / ROW_HEIGHT;
  return rows[index]?.textContent ?? `<no row at ${index}>`;
}

describe("Preview frame change navigation", () => {
  it("hides the buttons without diff rows", () => {
    renderDiffFrame(/*withDiff=*/ false);
    expect(screen.queryByRole("button", { name: "Next change" })).not.toBeInTheDocument();
  });

  it("centers each change block in turn and wraps around", () => {
    const { container } = renderDiffFrame(/*withDiff=*/ true);
    const { body, rows } = stubLayout(container);
    const next = screen.getByRole("button", { name: "Next change" });

    fireEvent.click(next);
    expect(centeredText(body, rows)).toContain("old8");
    fireEvent.click(next);
    expect(centeredText(body, rows)).toContain("line25");
    fireEvent.click(next);
    expect(centeredText(body, rows)).toContain("old8");
  });

  it("steps backwards with Alt+ArrowUp on the focused frame", () => {
    const { container, widget } = renderDiffFrame(/*withDiff=*/ true);
    const { body, rows } = stubLayout(container);
    widget.focus();

    fireEvent.keyDown(window, { key: "ArrowUp", altKey: true });
    expect(centeredText(body, rows)).toContain("line25");
  });
});
