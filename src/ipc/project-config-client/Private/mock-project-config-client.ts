// @Architecture(descriptionShort="In-memory project config client for tests and browser mode")
import {
  defaultProjectConfig,
  type ProjectConfig,
  type ProjectConfigClient,
} from "./project-config-client";

export function createMockProjectConfigClient(
  initial: ProjectConfig = defaultProjectConfig(),
): ProjectConfigClient {
  let config = cloneConfig(initial);
  return {
    async readProjectConfig(): Promise<ProjectConfig> {
      return cloneConfig(config);
    },
    async writeProjectConfig(_path: string, next: ProjectConfig): Promise<void> {
      config = cloneConfig(next);
    },
  };
}

function cloneConfig(config: ProjectConfig): ProjectConfig {
  return JSON.parse(JSON.stringify(config)) as ProjectConfig;
}
