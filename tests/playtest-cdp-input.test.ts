import { describe, expect, it } from "vitest";
import {
  describeKey,
  dispatchPressKey,
  modifierMask,
  parseKeyCombo,
} from "../tools/playtest-mcp/Private/cdp-keyboard.ts";
import { dispatchClick, dispatchDrag, dispatchWheel } from "../tools/playtest-mcp/Private/cdp-pointer.ts";
import type { CdpClient } from "../tools/playtest-mcp/Private/cdp-client.ts";

function fakeCdp() {
  const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const cdp = {
    async send<T = Record<string, unknown>>(method: string, params?: Record<string, unknown>): Promise<T> {
      calls.push({ method, params: params ?? {} });
      return {} as T;
    },
    async evaluate<T>(): Promise<T> {
      return {} as T;
    },
  } as unknown as CdpClient;
  return { cdp, calls };
}

describe("cdp-keyboard", () => {
  it("maps modifiers and special keys", () => {
    expect(modifierMask(["Control", "Shift"])).toBe(10);
    expect(describeKey("F12")).toEqual({ key: "F12", code: "F12", keyCode: 123 });
    expect(parseKeyCombo("Control+Shift+f")).toEqual({
      modifiers: ["Control", "Shift"],
      key: { key: "f", code: "KeyF", keyCode: 70, text: "f" },
    });
  });

  it("dispatches rawKeyDown + char for printable keys and omits char for Ctrl shortcuts", async () => {
    const { cdp, calls } = fakeCdp();
    await dispatchPressKey(cdp, "a");
    expect(calls.map((c) => c.params.type)).toEqual(["rawKeyDown", "char", "keyUp"]);

    calls.length = 0;
    await dispatchPressKey(cdp, "Control+p");
    expect(calls.map((c) => c.params.type)).toEqual(["rawKeyDown", "keyUp"]);
    expect(calls[0].params.modifiers).toBe(2);
  });
});

describe("cdp-pointer", () => {
  it("dispatches double click, interpolated drag, and multi-step wheel events", async () => {
    const { cdp, calls } = fakeCdp();
    await dispatchClick(cdp, { x: 100, y: 200, button: "left", clickCount: 2 });
    expect(calls.map((c) => c.params.type)).toEqual([
      "mouseMoved",
      "mousePressed",
      "mouseReleased",
      "mousePressed",
      "mouseReleased",
    ]);

    calls.length = 0;
    await dispatchDrag(cdp, { fromX: 0, fromY: 0, toX: 100, toY: 50, steps: 2 });
    expect(calls.map((c) => c.params.type)).toEqual([
      "mouseMoved",
      "mousePressed",
      "mouseMoved",
      "mouseMoved",
      "mouseReleased",
    ]);
    expect(calls[2].params).toMatchObject({ x: 50, y: 25, buttons: 1 });

    calls.length = 0;
    await dispatchWheel(cdp, { x: 50, y: 50, deltaY: -400, steps: 4 });
    expect(calls.filter((c) => c.params.type === "mouseWheel")).toHaveLength(4);
  });
});
