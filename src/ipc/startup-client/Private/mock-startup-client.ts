// @Architecture(descriptionShort="Mock startup client for jsdom tests and web-only dev")
import type { StartupClient } from "./startup-client";

export function createMockStartupClient(
  path: string | null = null,
): StartupClient {
  return {
    async getStartupProjectPath(): Promise<string | null> {
      return path;
    },
  };
}
