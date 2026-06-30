// @Architecture(descriptionShort="Defines project-local CodeChart config IPC")

export interface ProjectConfig {
  unreal: UnrealConfig;
}

export interface UnrealConfig {
  knownPaths: string[];
  hideGeneratedFiles: boolean;
  excludeEngineReferences: boolean;
}

export interface ProjectConfigClient {
  readProjectConfig(path: string): Promise<ProjectConfig>;
  writeProjectConfig(path: string, config: ProjectConfig): Promise<void>;
}

export const defaultProjectConfig = (): ProjectConfig => ({
  unreal: {
    knownPaths: [],
    hideGeneratedFiles: true,
    excludeEngineReferences: true,
  },
});
