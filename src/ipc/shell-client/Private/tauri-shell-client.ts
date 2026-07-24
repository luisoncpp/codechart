// @Architecture(descriptionShort="Uses Tauri opener to open or reveal files")
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import type { ShellClient } from "./shell-client";

export function createTauriShellClient(): ShellClient {
  return {
    async openInEditor(absolutePath: string, editor: string): Promise<void> {
      await openPath(absolutePath, editor);
    },
    async revealInExplorer(absolutePath: string): Promise<void> {
      await revealItemInDir(absolutePath);
    },
  };
}
