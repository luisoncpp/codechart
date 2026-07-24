// @Architecture(descriptionShort="Defines project-local CodeChart config IPC")

export interface ProjectConfig {
  editor: string;
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

export const DEFAULT_EDITOR = "code";

export const defaultProjectConfig = (): ProjectConfig => ({
  editor: DEFAULT_EDITOR,
  unreal: {
    knownPaths: [],
    hideGeneratedFiles: true,
    excludeEngineReferences: true,
  },
});
