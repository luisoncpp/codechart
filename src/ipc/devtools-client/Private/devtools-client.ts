// @Architecture(descriptionShort="IPC interface for opening/toggling developer tools")
export interface DevtoolsClient {
  toggleDevtools(): Promise<void>;
}
