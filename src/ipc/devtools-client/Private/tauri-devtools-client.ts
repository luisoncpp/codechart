// @Architecture(descriptionShort="Tauri IPC implementation for developer tools")
import { invoke } from "@tauri-apps/api/core";
import type { DevtoolsClient } from "./devtools-client";

export function createTauriDevtoolsClient(): DevtoolsClient {
  return {
    async toggleDevtools(): Promise<void> {
      await invoke("toggle_devtools");
    },
  };
}
