// @Architecture(descriptionShort="Defines the abstract interface for startup CLI path and executable path access")
export interface StartupClient {
  getStartupProjectPath(): Promise<string | null>;
  /** Absolute path of the running app executable; null when unknown (mock, web). */
  getExecutablePath(): Promise<string | null>;
}
