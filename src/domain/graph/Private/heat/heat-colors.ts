// @Architecture(descriptionShort="Maps normalized heat scores to heatmap tints")
import type { HeatmapMode } from "./heat-types";

const STOPS: Record<HeatmapMode, readonly [string, string]> = {
  activity: ["#3b82f6", "#f59e0b"],
  risk: ["#94a3b8", "#f43f5e"],
  instability: ["#2dd4bf", "#6d28d9"],
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const ch = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

function mixHex(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t));
}

function stopsFor(mode: HeatmapMode): readonly [string, string] {
  return STOPS[mode];
}

/** Heat lane color for a normalized score in [0, 1]. */
export function heatColor(mode: HeatmapMode, score: number): string {
  const stops = stopsFor(mode);
  return mixHex(stops[0], stops[1], Math.max(0, Math.min(1, score)));
}

/** Fill tint opacity for L1 module cards (15–35%). */
export function heatFillOpacity(score: number): number {
  return 0.15 + score * 0.2;
}

/** CSS background for a heat fill overlay. */
export function heatFill(mode: HeatmapMode, score: number): string {
  const color = heatColor(mode, score);
  const alpha = Math.round(heatFillOpacity(score) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color}${alpha}`;
}

/** Gradient stops for the compact legend chip. */
export function heatLegendGradient(mode: HeatmapMode): string {
  const stops = stopsFor(mode);
  return `linear-gradient(to right, ${stops[0]}, ${stops[1]})`;
}
