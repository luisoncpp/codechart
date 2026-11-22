// @Architecture(descriptionShort="Coordinates Codechart app lifecycle, CDP connection, and playtest bridge")
import { CdpClient, discoverCdpTargets, selectPageTarget } from "./cdp-client.ts";
import { ProcessLauncher } from "./process-launcher.ts";
import type { BridgeActionArgs, BridgeActionName, LaunchOptions } from "./types.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(/*bridgePollWait*/ resolve, /*delayMs=*/ ms));
}

function wrapBridgeCall(call: string): string {
  return `(() => {
    const b = window.__codechartPlaytest;
    if (!b) throw new Error("window.__codechartPlaytest is unavailable (requires dev mode)");
    return ${call};
  })()`;
}

const BRIDGE_CALLS: Record<BridgeActionName, (args: BridgeActionArgs) => string> = {
  open_project: (a) => `b.loadProject(${JSON.stringify(requireArg(a.path, "path"))})`,
  wait_for_ready: (a) => `b.waitForReady(${JSON.stringify(a.timeoutMs ?? 20_000)})`,
  focus_module: (a) => `b.focusModule(${JSON.stringify(requireArg(a.moduleId, "moduleId"))})`,
  set_viewport: (a) => `b.setViewport(${JSON.stringify({ x: a.x, y: a.y, zoom: a.zoom })})`,
  fit_view: () => "b.fitView()",
  set_zoom_level: (a) => `b.setZoomLevel(${JSON.stringify(requireArg(a.zoomLevel, "zoomLevel"))})`,
  apply_diff_paste: (a) => `b.applyDiffFromPaste(${JSON.stringify(requireArg(a.diffText, "diffText"))})`,
  clear_diff: () => "b.clearDiffOverlay()",
  resize_window: (a) => {
    const width = requireArg(a.width, "width");
    const height = requireArg(a.height, "height");
    return `b.resizeWindow(${JSON.stringify(width)}, ${JSON.stringify(height)})`;
  },
  list_nodes: () => "b.listNodes()",
};

export class PlaytestSession {
  private readonly launcher = new ProcessLauncher();
  private cdp: CdpClient | null = null;

  getClient(): CdpClient {
    if (!this.cdp || !this.cdp.isConnected()) {
      throw new Error("No active Codechart playtest session. Call launch_app or connect_app first.");
    }
    return this.cdp;
  }

  async launch(options: LaunchOptions = {}): Promise<Record<string, unknown>> {
    this.disconnectClient();
    const launched = await this.launcher.launch(options);
    try {
      this.cdp = await CdpClient.connect(launched.wsUrl);
      await this.waitForBridge(options.timeoutMs ?? 20_000);
      const shouldWait = options.projectPath && options.waitForReady !== false;
      const state = shouldWait
        ? await this.runBridgeAction("wait_for_ready", { timeoutMs: options.timeoutMs ?? 25_000 })
        : await this.getState();
      return {
        launched: { cdpPort: launched.cdpPort, reusedVite: launched.reusedVite },
        state,
      };
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async connect(port: number): Promise<Record<string, unknown>> {
    this.disconnectClient();
    const targets = await discoverCdpTargets(port);
    const target = selectPageTarget(targets);
    if (!target?.webSocketDebuggerUrl) {
      throw new Error(`No inspectable Codechart page target found on CDP port ${port}`);
    }
    this.cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
    await this.waitForBridge(10_000);
    return { connected: { port, url: target.url }, state: await this.getState() };
  }

  async close(): Promise<{ closed: boolean }> {
    this.disconnectClient();
    await this.launcher.close();
    return { closed: true };
  }

  async getState(): Promise<unknown> {
    return this.getClient().evaluate(wrapBridgeCall("b.getState()"));
  }

  async runBridgeAction(action: BridgeActionName, args: BridgeActionArgs = {}): Promise<unknown> {
    const expr = wrapBridgeCall(BRIDGE_CALLS[action](args));
    return this.getClient().evaluate(expr, /*awaitPromise=*/ true);
  }

  private disconnectClient(): void {
    this.cdp?.close();
    this.cdp = null;
  }

  private async waitForBridge(timeoutMs: number): Promise<void> {
    const client = this.getClient();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      try {
        const ready = await client.evaluate<boolean>("Boolean(window.__codechartPlaytest)");
        if (ready) return;
      } catch {
        // Page still navigating or compiling.
      }
      await sleep(120);
    }
    throw new Error("Timed out waiting for window.__codechartPlaytest to initialize");
  }
}

function requireArg<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing required argument: ${name}`);
  return value;
}
