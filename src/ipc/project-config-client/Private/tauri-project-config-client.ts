// @Architecture(descriptionShort="Bridges project config requests to Tauri commands")
import { invoke } from "@tauri-apps/api/core";
import type { ProjectConfig, ProjectConfigClient } from "./project-config-client";

export function createTauriProjectConfigClient(): ProjectConfigClient {
  return {
    async readProjectConfig(path: string): Promise<ProjectConfig> {
      return invoke<ProjectConfig>("read_project_config", { path });
    },
    async writeProjectConfig(path: string, config: ProjectConfig): Promise<void> {
      await invoke("write_project_config", { path, config });
    },
  };
}
