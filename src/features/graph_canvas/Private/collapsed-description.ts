// @Architecture(descriptionShort="Pure fit math for the L0 collapsed card label + description")
import type { GroupNodeData } from "../../../domain/graph";
import { PRESETS } from "../../../domain/layout";
import { iconFontSize, iconGlyph } from "./icon-map";
import { descriptionRegion, type DescRegion } from "./collapsed-description-region";
export const L0_DESC_FONT = 14;
const L0_DESC_MAX_FONT = 28;
export const L0_LABEL_FONT = 15;
const L0_LABEL_MIN_FONT = 8;
const LABEL_CHAR_RATIO = 0.72;
const LABEL_LINE_RATIO = 1.1;
const CARD_PADDING = 16;
/** The fitted card title: world-unit font, wrapped line count, header row
 *  height, and the scale for the header chrome (toggle, gaps, icon) — chrome
 *  shrinks with the font, or a fixed `24 × scale` toggle would eat a small
 *  card before the text got any width. */
export type CardLabelLayout = {
  font: number;
  lines: number;
  chromeScale: number;
  height: number;
  width: number;
};

/** Largest label font (base…floor, counter-scaled) whose word-wrapped title
 *  fits the card; at the floor the title force-wraps instead of overflowing. */
export function collapsedLabelLayout(
  data: GroupNodeData,
  scale: number,
  dims: { width?: number; height?: number } = {},
): CardLabelLayout {
  const cardW = dims.width ?? PRESETS.collapsedGroupWidth;
  const cardH = dims.height ?? PRESETS.collapsedGroupHeight;
  const fullWidth = cardW - 2 * CARD_PADDING;
  const fitted = fittedLabel(data, scale, { width: fullWidth, height: cardH });
  if (fitted) return fitted;
  const font = L0_LABEL_MIN_FONT * scale;
  const width = childFreeLabelWidth(data, fullWidth, labelLayout(font, fullWidth).height);
  return forcedLabelLayout(font, width);
}

function fittedLabel(
  data: GroupNodeData,
  scale: number,
  region: { width: number; height: number },
): CardLabelLayout | null {
  for (let px = L0_LABEL_FONT; px >= L0_LABEL_MIN_FONT; px--) {
    const font = px * scale;
    const height = labelLayout(font, region.width).height;
    const width = childFreeLabelWidth(data, region.width, height);
    const layout = labelLayoutAt(data, font, width);
    if (!layout || !fitsCardHeight(layout, region.height)) continue;
    return layout;
  }
  return null;
}

function fitsCardHeight(layout: CardLabelLayout, cardH: number): boolean {
  return layout.height <= cardH - 2 * CARD_PADDING;
}

function childFreeLabelWidth(data: GroupNodeData, fullWidth: number, height: number): number {
  const bottom = CARD_PADDING + height + 12;
  const blockers = data.childObstacles?.filter(
    (box) => box.y < bottom && box.y + box.height > CARD_PADDING,
  );
  if (blockers?.length) {
    const edge = Math.min(...blockers.map((box) => box.x));
    return Math.max(1, Math.min(fullWidth, edge - CARD_PADDING - 12));
  }
  if (data.minChildY === undefined || bottom <= data.minChildY) return fullWidth;
  return Math.max(1, (data.minChildX ?? fullWidth) - CARD_PADDING - 12);
}

function labelChromeWidth(data: GroupNodeData, font: number): number {
  const chromeScale = font / L0_LABEL_FONT;
  const icon = iconGlyph(data.icon) ? iconFontSize(18, chromeScale) + 6 * chromeScale : 0;
  return (24 + 6) * chromeScale + icon;
}

function labelLayoutAt(
  data: GroupNodeData,
  font: number,
  width: number,
): CardLabelLayout | null {
  const textWidth = data.label.length * (font * LABEL_CHAR_RATIO + 0.5);
  if (textWidth + labelChromeWidth(data, font) > width) return null;
  return labelLayout(font, width);
}

function forcedLabelLayout(
  font: number,
  width: number,
): CardLabelLayout {
  return labelLayout(font, width);
}

function labelLayout(font: number, width: number): CardLabelLayout {
  const chromeScale = font / L0_LABEL_FONT;
  return {
    font,
    lines: 1,
    chromeScale,
    width,
    height: Math.max(24 * chromeScale, font * LABEL_LINE_RATIO),
  };
}

/** Picks the card text (long when it fits, else short) plus the region it must
 *  render in — width, line clamp, and font — measured in world units at the
 *  counter-scaled font, so the render wraps exactly as measured. */
export function collapsedDescription(
  data: GroupNodeData,
  scale: number,
  dims: { width?: number; height?: number } = {},
) {
  const cardW = dims.width ?? PRESETS.collapsedGroupWidth;
  const cardH = dims.height ?? PRESETS.collapsedGroupHeight;
  // The description starts below the fitted title row (which may wrap).
  const descTop = CARD_PADDING + collapsedLabelLayout(data, scale, dims).height + 8 * scale;

  const region = descriptionRegion(data, { cardW, cardH, descTop });
  const baseFont = L0_DESC_FONT * scale;
  if (Math.floor(region.height / (baseFont * 1.35)) < 1 || region.width <= 0) {
    return null;
  }

  const text = pickDescriptionText(data, region, baseFont);
  if (!text) return null;
  const font = fitCardFont(text, region, scale);
  const lines = Math.floor(region.height / (font * 1.35));
  return { text, lines, width: region.width, font };
}

/** Largest counter-scaled font (base…cap) at which `text` still fits `region`:
 *  the prose grows only when there is room to spare, never into truncation. */
function fitCardFont(text: string, region: DescRegion, scale: number): number {
  for (let px = L0_DESC_MAX_FONT; px > L0_DESC_FONT; px--) {
    if (fitsBox(text, region, px * scale)) return px * scale;
  }
  return L0_DESC_FONT * scale;
}

/** The long prose when it fits the region, else the short blurb. */
function pickDescriptionText(data: GroupNodeData, region: DescRegion, font: number) {
  if (data.descriptionLong && fitsBox(data.descriptionLong, region, font)) {
    return data.descriptionLong;
  }
  return data.descriptionShort;
}

/** Does `text` fit using the same space/hyphen wrapping opportunities as CSS? */
function fitsBox(text: string, region: DescRegion, font: number): boolean {
  const charsPerLine = Math.max(1, Math.floor(region.width / (font * 0.52)));
  const availableLines = Math.floor(region.height / (font * 1.35));
  return wrappedLineCount(text, charsPerLine) <= availableLines;
}

function wrappedLineCount(text: string, charsPerLine: number): number {
  const segments = text.trim().replace(/-/g, "- ").split(/\s+/).filter(Boolean);
  let lines = 1;
  let used = 0;
  let afterHyphen = false;
  for (const segment of segments) {
    const gap = used > 0 && !afterHyphen ? 1 : 0;
    if (used + gap + segment.length <= charsPerLine) {
      used += gap + segment.length;
    } else {
      if (used > 0) lines++;
      lines += Math.max(0, Math.ceil(segment.length / charsPerLine) - 1);
      used = segment.length % charsPerLine || charsPerLine;
    }
    afterHyphen = segment.endsWith("-");
  }
  return lines;
}
