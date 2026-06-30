// @Architecture(descriptionShort="Level-aware heat tint styles for canvas node views")
import { heatColor, heatFill, heatFillOpacity } from "../../../domain/graph";
import type { HeatmapMode } from "../../../domain/graph";

interface HeatData {
  heatmapActive?: boolean;
  heatScore?: number;
  heatVisible?: boolean;
  heatMode?: HeatmapMode;
}

const HEAT_LABEL = "#334155";
const GROUP_HEAT_LABEL = "#0f172a";
const GROUP_HEAT_DESC = "#334155";
const GROUP_HEAT_CONTROL = "#475569";

export function groupTextColors(data: HeatData & { color: string }): {
  label: string;
  description: string;
  control: string;
} {
  if (!heatmapStyled(data)) {
    return { label: data.color, description: data.color, control: data.color };
  }
  return {
    label: GROUP_HEAT_LABEL,
    description: GROUP_HEAT_DESC,
    control: GROUP_HEAT_CONTROL,
  };
}

export function heatScoreOf(data: HeatData): number {
  return data.heatScore ?? 0;
}

export function heatmapStyled(
  data: HeatData,
): data is HeatData & { heatmapActive: true; heatMode: HeatmapMode } {
  return !!(data.heatmapActive && data.heatMode);
}

export function groupAccentColor(data: HeatData & { color: string }): string {
  if (!heatmapStyled(data)) return data.color;
  return heatColor(data.heatMode, heatScoreOf(data));
}

export function moduleCardBackground(
  data: HeatData,
  groupColor: string,
  detail: boolean,
): string {
  if (!heatmapStyled(data)) {
    return detail ? `${groupColor}0d` : `${groupColor}1a`;
  }
  const score = heatScoreOf(data);
  return heatFill(data.heatMode, detail ? score * 0.85 : score);
}

export function moduleCardBorder(
  data: HeatData,
  groupColor: string,
  isFacade: boolean,
): string {
  const px = isFacade ? 2 : 1;
  if (!heatmapStyled(data)) return `${px}px solid ${groupColor}`;
  return `${px}px solid ${heatColor(data.heatMode, heatScoreOf(data))}`;
}

export function moduleLabelColor(data: HeatData, textColor: string): string {
  return heatmapStyled(data) ? HEAT_LABEL : textColor;
}

export function groupShellStyle(data: HeatData & { color: string }): {
  border: string;
  background: string;
} {
  if (!heatmapStyled(data)) {
    return { border: `2px solid ${data.color}`, background: `${data.color}14` };
  }
  const score = heatScoreOf(data);
  return {
    border: `2px solid ${heatColor(data.heatMode, score)}`,
    background: heatFill(data.heatMode, score),
  };
}

export function l15HeatBarStyle(data: HeatData): React.CSSProperties | undefined {
  if (!heatmapStyled(data)) return undefined;
  return {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: heatColor(data.heatMode, heatScoreOf(data)),
    zIndex: 2,
    pointerEvents: "none",
  };
}

export function l2HeatBorder(data: HeatData, fallback: string): string {
  if (!heatmapStyled(data)) return fallback;
  return `2px solid ${heatColor(data.heatMode, heatScoreOf(data))}`;
}

export function l2HeatHeaderBar(data: HeatData): React.CSSProperties | undefined {
  if (!heatmapStyled(data)) return undefined;
  return {
    height: 4,
    background: heatColor(data.heatMode, heatScoreOf(data)),
    flexShrink: 0,
  };
}

export function symbolBorderColor(data: HeatData, groupColor: string): string {
  if (!heatmapStyled(data)) return groupColor;
  return heatColor(data.heatMode, heatScoreOf(data));
}

export function symbolHeatTintVar(data: HeatData): string | undefined {
  if (!heatmapStyled(data)) return undefined;
  return heatColor(data.heatMode, heatScoreOf(data));
}

export function symbolHeatMixPercent(data: HeatData): number | undefined {
  if (!heatmapStyled(data)) return undefined;
  const score = heatScoreOf(data);
  return Math.min(20, Math.round(heatFillOpacity(score) * 100));
}
