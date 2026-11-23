// @Architecture(descriptionShort="Keyboard and text-input CDP helpers")
import type { CdpClient } from "./cdp-client.ts";
import { resolveTargetPoint } from "./cdp-dom.ts";
import type { TypeTextOptions } from "./types.ts";

interface KeyDescriptor {
  key: string;
  code: string;
  keyCode: number;
  text?: string;
}

const SPECIAL_KEYS: Record<string, KeyDescriptor> = {
  enter: { key: "Enter", code: "Enter", keyCode: 13, text: "\r" },
  escape: { key: "Escape", code: "Escape", keyCode: 27 },
  esc: { key: "Escape", code: "Escape", keyCode: 27 },
  tab: { key: "Tab", code: "Tab", keyCode: 9 },
  backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
  delete: { key: "Delete", code: "Delete", keyCode: 46 },
  space: { key: " ", code: "Space", keyCode: 32, text: " " },
  arrowup: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  arrowdown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  arrowleft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  arrowright: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  home: { key: "Home", code: "Home", keyCode: 36 },
  end: { key: "End", code: "End", keyCode: 35 },
  pageup: { key: "PageUp", code: "PageUp", keyCode: 33 },
  pagedown: { key: "PageDown", code: "PageDown", keyCode: 34 },
};

const MODIFIER_BITS: Record<string, number> = {
  alt: 1,
  control: 2,
  ctrl: 2,
  meta: 4,
  shift: 8,
};

export function modifierMask(modifiers?: string[]): number {
  if (!modifiers) return 0;
  let mask = 0;
  for (const mod of modifiers) {
    mask |= MODIFIER_BITS[mod.toLowerCase()] ?? 0;
  }
  return mask;
}

export function describeKey(rawKey: string): KeyDescriptor {
  const lower = rawKey.toLowerCase();
  if (SPECIAL_KEYS[lower]) return SPECIAL_KEYS[lower];
  const fnMatch = /^f(\d{1,2})$/i.exec(rawKey);
  if (fnMatch) {
    const n = Number(fnMatch[1]);
    return { key: `F${n}`, code: `F${n}`, keyCode: 111 + n };
  }
  if (rawKey.length === 1) {
    const upper = rawKey.toUpperCase();
    const code = /^[A-Z]$/.test(upper)
      ? `Key${upper}`
      : /^[0-9]$/.test(rawKey)
        ? `Digit${rawKey}`
        : "";
    return { key: rawKey, code, keyCode: upper.charCodeAt(0), text: rawKey };
  }
  return { key: rawKey, code: rawKey, keyCode: 0 };
}

export function parseKeyCombo(combo: string): { modifiers: string[]; key: KeyDescriptor } {
  const parts = combo.split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Empty key combo");
  const primary = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1).filter((m) => MODIFIER_BITS[m.toLowerCase()] !== undefined);
  return { modifiers, key: describeKey(primary) };
}

export async function dispatchPressKey(
  cdp: Pick<CdpClient, "send">,
  combo: string,
): Promise<void> {
  const { modifiers, key } = parseKeyCombo(combo);
  const mask = modifierMask(modifiers);
  await cdp.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: key.key,
    code: key.code,
    windowsVirtualKeyCode: key.keyCode,
    modifiers: mask,
  });
  if (key.text && (mask & ~8) === 0) {
    await cdp.send("Input.dispatchKeyEvent", {
      type: "char",
      key: key.key,
      text: key.text,
      unmodifiedText: key.text,
      windowsVirtualKeyCode: key.keyCode,
      modifiers: mask,
    });
  }
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: key.key,
    code: key.code,
    windowsVirtualKeyCode: key.keyCode,
    modifiers: mask,
  });
}

export async function dispatchTypeText(cdp: CdpClient, options: TypeTextOptions): Promise<void> {
  if (options.selector || options.text || (options.x !== undefined && options.y !== undefined)) {
    const point = await resolveTargetPoint(cdp, options);
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  }
  if (options.clearFirst) {
    await dispatchPressKey(cdp, "Control+a");
    await dispatchPressKey(cdp, "Backspace");
  }
  await cdp.send("Input.insertText", { text: options.value });
}
