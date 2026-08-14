// @Architecture(descriptionShort="Tauri IPC implementation of the startup client")
import { invoke } from "@tauri-apps/api/core";
import type { StartupClient } from "./startup-client";

export function createTauriStartupClient(): StartupClient {
  return {
    async getStartupProjectPath(): Promise<string | null> {
      return invoke<string | null>("get_startup_project_path");
    },
  };
}
