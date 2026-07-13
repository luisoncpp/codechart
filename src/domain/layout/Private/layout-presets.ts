// @Architecture(descriptionShort="Deterministic layout sizing presets shared by ELK and projection")
import { SYMBOL_BOX } from "./symbol-box-metrics";

/** Layout presets (TDD §"layout presets"). */
export const PRESETS = {
  moduleWidth: 120,
  moduleHeight: 90,
  /** Minimum footprint for each exported-symbol box (grows with label length). */
  symbolWidth: SYMBOL_BOX.minWidth,
  symbolHeight: SYMBOL_BOX.height,
  moduleSymbolPadding: 6,
  moduleHeaderHeight: 20,
  groupPadding: 12,
  groupHeaderHeight: 30,
  nodeSpacing: 32,
  layerSpacing: 56,
  /**
   * A collapsed (childless) group keeps a full card footprint — it must NOT
   * shrink to a tiny stub when its modules disappear. Sized to hold a large
   * label + a few wrapped description lines (see GroupNodeView).
   */
  collapsedGroupWidth: 300,
  collapsedGroupHeight: 168,
} as const;
