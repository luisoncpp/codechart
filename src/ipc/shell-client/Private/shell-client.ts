// @Architecture(descriptionShort="Opens paths in the OS shell (file explorer)")
export interface ShellClient {
  revealInExplorer(absolutePath: string): Promise<void>;
}
