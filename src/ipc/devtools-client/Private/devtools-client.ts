// @Architecture(descriptionShort="IPC interface for opening/toggling developer tools and window sizing")
export interface DevtoolsClient {
  toggleDevtools(): Promise<void>;
  setWindowSize(width: number, height: number): Promise<void>;
}
