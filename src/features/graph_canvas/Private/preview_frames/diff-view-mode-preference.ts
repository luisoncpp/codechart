// @Architecture(descriptionShort="Per-frame diff view mode, seeded from the session-wide last choice")
import { useState } from "react";
import type { DiffViewMode } from "../../../../domain/diff";

/**
 * Each frame owns its mode; this only remembers the last pick so frames opened
 * afterwards start there. In memory only: a restart is back to Unified.
 */
class DiffViewModePreference {
  private last: DiffViewMode = "unified";

  get(): DiffViewMode {
    return this.last;
  }

  set(mode: DiffViewMode): void {
    this.last = mode;
  }
}

export const diffViewModePreference = new DiffViewModePreference();

export interface FrameDiffViewMode {
  /** Header toggle; null while the frame shows no diff rows. */
  toggle: { mode: DiffViewMode; onChange: (mode: DiffViewMode) => void } | null;
  /** What the body renders: always unified without diff rows (no empty split columns). */
  bodyMode: DiffViewMode;
}

/** Hook adapter: one frame's mode state over the shared preference. */
export function useFrameDiffViewMode(showsDiffRows: boolean): FrameDiffViewMode {
  const [mode, setMode] = useState(/*seedFromLastChoice*/ () => diffViewModePreference.get());
  if (!showsDiffRows) return { toggle: null, bodyMode: "unified" };
  const onChange = (next: DiffViewMode) => {
    diffViewModePreference.set(next);
    setMode(next);
  };
  return { toggle: { mode, onChange }, bodyMode: mode };
}
