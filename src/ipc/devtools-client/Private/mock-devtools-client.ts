// @Architecture(descriptionShort="Mock devtools client for jsdom tests and web dev")
import type { DevtoolsClient } from "./devtools-client";

export function createMockDevtoolsClient(onToggle?: () => void): DevtoolsClient {
  return {
    async toggleDevtools(): Promise<void> {
      onToggle?.();
    },
  };
}
