// @Architecture(descriptionShort="Uses Tauri opener plugin to reveal files in the OS shell")
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { ShellClient } from "./shell-client";

export function createTauriShellClient(): ShellClient {
  return {
    async revealInExplorer(absolutePath: string): Promise<void> {
      await revealItemInDir(absolutePath);
    },
  };
}
