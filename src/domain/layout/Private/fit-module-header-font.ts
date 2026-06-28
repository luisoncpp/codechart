import { LABEL_FIT, labelCharsPerLine, MODULE_BOX } from "./module-box-metrics";
import { wrapIdentifierLines } from "./wrap-identifier";

const DETAIL_HEADER = {
  maxFont: 9,
  minFont: 7,
  height: 20,
} as const;

/** Largest font at which a wrapped filename (+ optional diff suffix) fits its header slot. */
export function fitModuleHeaderFontSize(
  label: string,
  suffixLen: number,
  width: number,
  height: number,
  detail: boolean,
): number {
  const minFont = detail ? DETAIL_HEADER.minFont : MODULE_BOX.fontSize;
  const maxFont = detail ? DETAIL_HEADER.maxFont : LABEL_FIT.maxFont;
  const innerH = detail ? DETAIL_HEADER.height : height - MODULE_BOX.vPadding;
  for (let font = maxFont; font >= minFont; font--) {
    if (headerFitsAtFont(label, suffixLen, width, font, innerH)) return font;
  }
  return minFont;
}

function headerFitsAtFont(
  label: string,
  suffixLen: number,
  width: number,
  font: number,
  innerH: number,
): boolean {
  const charsPerLine = labelCharsPerLine(width, font);
  const lines = wrapIdentifierLines(label, charsPerLine);
  let totalLines = lines.length;
  if (suffixLen > 0) {
    const lastLen = lines[totalLines - 1]?.length ?? 0;
    if (lastLen + 1 + suffixLen > charsPerLine) totalLines++;
    if (suffixLen > charsPerLine) return false;
  }
  return totalLines * font * LABEL_FIT.lineRatio <= innerH;
}
