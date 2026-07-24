// @Architecture(descriptionShort="Opens paths in configured apps or the OS explorer")
export interface ShellClient {
  openInEditor(absolutePath: string, editor: string): Promise<void>;
  revealInExplorer(absolutePath: string): Promise<void>;
}
