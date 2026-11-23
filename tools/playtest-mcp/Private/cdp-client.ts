// @Architecture(descriptionShort="Lightweight WebSocket CDP client on Node 24 built-ins")
import type { CdpTarget, ConsoleEntry } from "./types.ts";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const MAX_LOG_ENTRIES = 200;

export async function discoverCdpTargets(port: number): Promise<CdpTarget[]> {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) {
    throw new Error(`CDP target list failed on port ${port}: HTTP ${response.status}`);
  }
  return (await response.json()) as CdpTarget[];
}

export function selectPageTarget(targets: CdpTarget[]): CdpTarget | undefined {
  const pages = targets.filter((t) => t.type === "page" && Boolean(t.webSocketDebuggerUrl));
  if (pages.length === 0) return undefined;
  return (
    pages.find((t) => t.url.includes("localhost:1420") || t.url.includes("tauri.localhost")) ??
    pages.find((t) => !t.url.startsWith("devtools://") && !t.url.startsWith("edge://")) ??
    pages[0]
  );
}

function formatRemoteArgs(args: Array<{ value?: unknown; description?: string }>): string {
  return args
    .map((arg) => (arg.value !== undefined ? String(arg.value) : (arg.description ?? "")))
    .filter(Boolean)
    .join(" ");
}

export class CdpClient {
  private readonly ws: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly logs: ConsoleEntry[] = [];
  private connected = false;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    this.connected = true;
    this.attachSocketListeners();
  }

  static async connect(wsUrl: string): Promise<CdpClient> {
    const ws = await new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      const timer = setTimeout(/*openTimeout*/ () => {
        socket.close();
        reject(new Error(`Timed out connecting to CDP WebSocket: ${wsUrl}`));
      }, /*timeoutMs=*/ 5000);
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error(`Failed connecting to CDP WebSocket: ${wsUrl}`));
      });
    });
    const client = new CdpClient(ws);
    await Promise.all([
      client.send("Runtime.enable"),
      client.send("Log.enable"),
      client.send("Page.enable"),
    ]);
    return client;
  }

  isConnected(): boolean {
    return this.connected && this.ws.readyState === WebSocket.OPEN;
  }

  async send<T = Record<string, unknown>>(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = 10_000,
  ): Promise<T> {
    if (!this.isConnected()) {
      throw new Error(`CDP socket closed before calling ${method}`);
    }
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(/*cdpCallTimeout*/ () => {
        this.pending.delete(id);
        reject(new Error(`CDP call timed out (${timeoutMs}ms): ${method}`));
      }, /*timeoutMs=*/ timeoutMs);
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      this.ws.send(JSON.stringify({ id, method, params: params ?? {} }));
    });
  }

  async evaluate<T = unknown>(expression: string, awaitPromise = true): Promise<T> {
    const res = await this.send<{
      result?: { value?: T; description?: string };
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    }>("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise,
    });
    if (res.exceptionDetails) {
      const detail = res.exceptionDetails.exception?.description ?? res.exceptionDetails.text ?? "Eval error";
      throw new Error(detail);
    }
    return res.result?.value as T;
  }

  getLogs(options?: { level?: string; clear?: boolean }): ConsoleEntry[] {
    const level = options?.level;
    const filtered = level ? this.logs.filter((entry) => entry.level === level) : [...this.logs];
    if (options?.clear) this.logs.length = 0;
    return filtered;
  }

  close(): void {
    this.connected = false;
    this.rejectAllPending("CDP client closed");
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
    }
  }

  private attachSocketListeners(): void {
    this.ws.addEventListener("message", (event) => this.handleMessage(String(event.data)));
    this.ws.addEventListener("close", () => {
      this.connected = false;
      this.rejectAllPending("CDP connection closed");
    });
  }

  private handleMessage(raw: string): void {
    const msg = JSON.parse(raw) as {
      id?: number;
      method?: string;
      result?: unknown;
      error?: { message?: string };
      params?: Record<string, unknown>;
    };
    if (msg.id !== undefined) {
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(msg.error.message ?? "CDP error"));
      else entry.resolve(msg.result ?? {});
      return;
    }
    this.handleEvent(msg.method, msg.params);
  }

  private handleEvent(method: string | undefined, params: Record<string, unknown> | undefined): void {
    if (!method || !params) return;
    const timestamp = new Date().toISOString();
    if (method === "Runtime.consoleAPICalled") {
      this.pushConsoleEvent(timestamp, params);
      return;
    }
    if (method === "Runtime.exceptionThrown") {
      this.pushExceptionEvent(timestamp, params);
      return;
    }
    if (method === "Log.entryAdded") {
      this.pushLogEvent(timestamp, params);
    }
  }

  private pushConsoleEvent(timestamp: string, params: Record<string, unknown>): void {
    const args = (params.args as Array<{ value?: unknown; description?: string }>) ?? [];
    this.pushLog({ timestamp, source: "console", level: String(params.type ?? "log"), text: formatRemoteArgs(args) });
  }

  private pushExceptionEvent(timestamp: string, params: Record<string, unknown>): void {
    const details = params.exceptionDetails as { text?: string; exception?: { description?: string } } | undefined;
    const text = details?.exception?.description ?? details?.text ?? "Uncaught exception";
    this.pushLog({ timestamp, source: "exception", level: "error", text });
  }

  private pushLogEvent(timestamp: string, params: Record<string, unknown>): void {
    const entry = params.entry as { level?: string; text?: string } | undefined;
    this.pushLog({ timestamp, source: "log", level: entry?.level ?? "info", text: entry?.text ?? "" });
  }

  private pushLog(entry: ConsoleEntry): void {
    this.logs.push(entry);
    if (this.logs.length > MAX_LOG_ENTRIES) this.logs.shift();
  }

  private rejectAllPending(reason: string): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error(reason));
    }
    this.pending.clear();
  }
}
