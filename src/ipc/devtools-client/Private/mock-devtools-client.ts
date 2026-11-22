// @Architecture(descriptionShort="Mock devtools client for jsdom tests and web dev")
import type { DevtoolsClient } from "./devtools-client";

export function createMockDevtoolsClient(
  onToggle?: () => void,
  onResize?: (width: number, height: number) => void,
): DevtoolsClient {
  return {
    async toggleDevtools(): Promise<void> {
      onToggle?.();
    },
    async setWindowSize(width: number, height: number): Promise<void> {
      onResize?.(width, height);
    },
  };
}
