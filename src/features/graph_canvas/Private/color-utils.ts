// @Architecture(descriptionShort="Shared color helpers for graph node views")

/** Darken a #rrggbb color toward black so text reads against a tint. */
export function darkenHex(hex: string, factor = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((n >> shift) & 0xff) * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
