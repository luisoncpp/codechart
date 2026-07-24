// @Architecture(descriptionShort="No-op shell client for tests and web dev")
import type { ShellClient } from "./shell-client";

export function createMockShellClient(): ShellClient {
  return {
    async openInEditor(): Promise<void> {},
    async revealInExplorer(): Promise<void> {},
  };
}
