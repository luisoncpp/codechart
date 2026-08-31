// @Architecture(descriptionShort="Defines project-local CodeChart config IPC")

export interface ProjectConfig {
  editor: string;
  /** Repo-relative directories excluded from visualization and analysis. */
  ignoredPaths: string[];
  unreal: UnrealConfig;
}

export interface UnrealConfig {
  knownPaths: string[];
  hideGeneratedFiles: boolean;
  excludeEngineReferences: boolean;
  hidePlugins: boolean;
}

export interface ProjectConfigClient {
  readProjectConfig(path: string): Promise<ProjectConfig>;
  writeProjectConfig(path: string, config: ProjectConfig): Promise<void>;
}

export const DEFAULT_EDITOR = "code";

export const defaultProjectConfig = (): ProjectConfig => ({
  editor: DEFAULT_EDITOR,
  ignoredPaths: [],
  unreal: {
    knownPaths: [],
    hideGeneratedFiles: true,
    excludeEngineReferences: true,
    hidePlugins: true,
  },
});

export async function writeHidePlugins(
  client: ProjectConfigClient,
  projectRoot: string,
  hide: boolean,
): Promise<ProjectConfig> {
  const current = await client.readProjectConfig(projectRoot);
  const next = {
    ...current,
    unreal: { ...current.unreal, hidePlugins: hide },
  };
  await client.writeProjectConfig(projectRoot, next);
  return next;
}

/**
 * Replace only `ignoredPaths`, preserving `editor` and `unreal`. Blank entries are
 * dropped so an unfinished input row never becomes a config value.
 */
export async function writeIgnoredPaths(
  client: ProjectConfigClient,
  projectRoot: string,
  paths: string[],
): Promise<ProjectConfig> {
  const current = await client.readProjectConfig(projectRoot);
  const next = {
    ...current,
    ignoredPaths: paths.map((p) => p.trim()).filter((p) => p.length > 0),
  };
  await client.writeProjectConfig(projectRoot, next);
  return next;
}
