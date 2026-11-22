// @Architecture(descriptionShort="Tauri IPC implementation for developer tools and window sizing")
import { invoke } from "@tauri-apps/api/core";
import type { DevtoolsClient } from "./devtools-client";

export function createTauriDevtoolsClient(): DevtoolsClient {
  return {
    async toggleDevtools(): Promise<void> {
      await invoke("toggle_devtools");
    },
    async setWindowSize(width: number, height: number): Promise<void> {
      await invoke("set_window_size", { width, height });
    },
  };
}
