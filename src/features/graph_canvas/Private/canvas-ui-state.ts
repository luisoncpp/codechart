// @Architecture(descriptionShort="Transient canvas UI flags (find bar, diff modal) shared with toolbar menus")
import { useEffect, useState } from "react";

type Listener = () => void;

/**
 * Holds transient canvas UI flags that the toolbar menus also drive.
 * Kept out of GraphSessionStore: these are view chrome, not session data.
 */
export class CanvasUiState {
  private findBarOpen = false;
  private diffModalOpen = false;
  private listeners: Listener[] = [];

  getFindBarOpen(): boolean {
    return this.findBarOpen;
  }

  setFindBarOpen(open: boolean) {
    if (this.findBarOpen === open) return;
    this.findBarOpen = open;
    this.emit();
  }

  getDiffModalOpen(): boolean {
    return this.diffModalOpen;
  }

  setDiffModalOpen(open: boolean) {
    if (this.diffModalOpen === open) return;
    this.diffModalOpen = open;
    this.emit();
  }

  /** Project reload/failure invalidates any open chrome. */
  reset() {
    if (!this.findBarOpen && !this.diffModalOpen) return;
    this.findBarOpen = false;
    this.diffModalOpen = false;
    this.emit();
  }

  on(listener: Listener) {
    this.listeners.push(listener);
  }

  off(listener: Listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

/** Adapter hook: re-renders the consumer whenever the flags change. */
export function useCanvasUiState(ui: CanvasUiState): CanvasUiState {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    ui.on(listener);
    return () => ui.off(listener);
  }, [ui]);
  return ui;
}
