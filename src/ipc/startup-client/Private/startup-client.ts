// @Architecture(descriptionShort="Defines the abstract interface for startup CLI path access")
export interface StartupClient {
  getStartupProjectPath(): Promise<string | null>;
}
