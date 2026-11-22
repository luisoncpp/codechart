// @Architecture(descriptionShort="Manages Vite dev server and isolated WebView2 Tauri processes")
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverCdpTargets, selectPageTarget } from "./cdp-client.ts";
import type { LaunchOptions } from "./types.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const VITE_URLS = ["http://localhost:1420", "http://127.0.0.1:1420"];
const MAX_OUTPUT_LINES = 60;

export interface LaunchedProcess {
  cdpPort: number;
  wsUrl: string;
  profileDir: string;
  reusedVite: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(/*sleepTimer*/ resolveSleep, /*delayMs=*/ ms));
}

async function isViteReady(): Promise<boolean> {
  for (const url of VITE_URLS) {
    try {
      const res = await fetch(url);
      if (res.status > 0) return true;
    } catch {
      // Try next loopback host.
    }
  }
  return false;
}

async function allocateFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close();
        reject(new Error("Failed to allocate ephemeral TCP port"));
        return;
      }
      const { port } = addr;
      srv.close(() => resolvePort(port));
    });
  });
}

function killProcessTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process already exited.
  }
}

function attachLineBuffer(child: ChildProcess, lines: string[]): void {
  const pushChunk = (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/)) {
      if (!line) continue;
      lines.push(line);
      if (lines.length > MAX_OUTPUT_LINES) lines.shift();
    }
  };
  child.stdout?.on("data", pushChunk);
  child.stderr?.on("data", pushChunk);
}

export class ProcessLauncher {
  private viteChild: ChildProcess | null = null;
  private tauriChild: ChildProcess | null = null;
  private profileDir: string | null = null;
  private outputTail: string[] = [];

  async launch(options: LaunchOptions = {}): Promise<LaunchedProcess> {
    await this.close();
    try {
      const reusedVite = await this.ensureVite(options.timeoutMs ?? 30_000);
      const cdpPort = options.cdpPort ?? (await allocateFreePort());
      const profileDir = mkdtempSync(join(tmpdir(), "codechart-playtest-"));
      this.profileDir = profileDir;
      this.outputTail = [];

      const env = this.buildTauriEnv(cdpPort, profileDir, options);
      const child = spawn("cargo", ["run", "--quiet", "--bin", "codechart"], {
        cwd: join(REPO_ROOT, "src-tauri"),
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      this.tauriChild = child;
      attachLineBuffer(child, this.outputTail);

      const wsUrl = await this.waitForCdpTarget(cdpPort, options.timeoutMs ?? 90_000);
      return { cdpPort, wsUrl, profileDir, reusedVite };
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.tauriChild) {
      killProcessTree(this.tauriChild.pid);
      this.tauriChild = null;
    }
    if (this.viteChild) {
      killProcessTree(this.viteChild.pid);
      this.viteChild = null;
    }
    if (this.profileDir) {
      await sleep(150);
      try {
        rmSync(this.profileDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
      } catch {
        // Best-effort temp profile cleanup.
      }
      this.profileDir = null;
    }
  }

  private buildTauriEnv(
    cdpPort: number,
    profileDir: string,
    options: LaunchOptions,
  ): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${cdpPort}`,
      WEBVIEW2_USER_DATA_FOLDER: profileDir,
    };
    if (options.projectPath) env.CODECHART_STARTUP_PROJECT = options.projectPath;
    const width = options.width ?? 1440;
    const height = options.height ?? 900;
    env.CODECHART_WINDOW_SIZE = `${width}x${height}`;
    return env;
  }

  private async ensureVite(timeoutMs: number): Promise<boolean> {
    if (await isViteReady()) return true;
    const viteLogs: string[] = [];
    const cmd = process.platform === "win32" ? "cmd.exe" : "npm";
    const args = process.platform === "win32" ? ["/c", "npm", "run", "dev"] : ["run", "dev"];
    this.viteChild = spawn(cmd, args, {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    attachLineBuffer(this.viteChild, viteLogs);

    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      if (this.viteChild.exitCode !== null) {
        throw new Error(`Vite exited early (${this.viteChild.exitCode}):\n${viteLogs.join("\n")}`);
      }
      if (await isViteReady()) return false;
      await sleep(200);
    }
    throw new Error(`Timed out waiting for Vite on :1420\n${viteLogs.join("\n")}`);
  }

  private async waitForCdpTarget(port: number, timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      if (this.tauriChild && this.tauriChild.exitCode !== null) {
        const tail = this.outputTail.join("\n");
        throw new Error(`Codechart exited early (${this.tauriChild.exitCode}):\n${tail}`);
      }
      try {
        const target = selectPageTarget(await discoverCdpTargets(port));
        if (target?.webSocketDebuggerUrl) return target.webSocketDebuggerUrl;
      } catch {
        // CDP server not listening yet.
      }
      await sleep(250);
    }
    throw new Error(`Timed out waiting for WebView2 CDP on port ${port}\n${this.outputTail.join("\n")}`);
  }
}
