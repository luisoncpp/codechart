import { afterEach, describe, expect, it, vi } from "vitest";
import { CdpClient, selectPageTarget } from "../tools/playtest-mcp/Private/cdp-client.ts";

class FakeWebSocket extends EventTarget {
  static readonly OPEN = 1;
  static readonly CONNECTING = 0;
  static readonly CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  readonly sent: string[] = [];

  constructor(
    _url: string,
    private readonly onSend: (ws: FakeWebSocket, payload: { id: number; method: string; params?: Record<string, unknown> }) => void,
  ) {
    super();
    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.dispatchEvent(new Event("open"));
    });
  }

  send(data: string): void {
    this.sent.push(data);
    this.onSend(this, JSON.parse(data));
  }

  emitJson(payload: unknown): void {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(payload) }));
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(new Event("close"));
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("selectPageTarget", () => {
  it("prefers Codechart app page over devtools or blank pages", () => {
    const selected = selectPageTarget([
      { id: "1", title: "DevTools", type: "page", url: "devtools://devtools/bundled/inspector.html", webSocketDebuggerUrl: "ws://1" },
      { id: "2", title: "Other", type: "page", url: "about:blank", webSocketDebuggerUrl: "ws://2" },
      { id: "3", title: "Codechart", type: "page", url: "http://localhost:1420/", webSocketDebuggerUrl: "ws://3" },
    ]);
    expect(selected?.id).toBe("3");
  });
});

describe("CdpClient", () => {
  it("handles RPC calls, evaluation exceptions, and console event buffering", async () => {
    const FakeCtor = class extends FakeWebSocket {
      constructor(url: string) {
        super(url, (ws, msg) => {
          if (msg.method === "Runtime.enable") {
            ws.emitJson({ id: msg.id, result: {} });
            ws.emitJson({
              method: "Runtime.consoleAPICalled",
              params: { type: "warn", args: [{ value: "test warning" }] },
            });
            return;
          }
          if (msg.method === "Runtime.evaluate") {
            const expr = String(msg.params?.expression ?? "");
            if (expr.includes("throw")) {
              ws.emitJson({
                id: msg.id,
                result: { exceptionDetails: { text: "Uncaught", exception: { description: "Error: boom" } } },
              });
              return;
            }
            ws.emitJson({ id: msg.id, result: { result: { value: 42 } } });
            return;
          }
          ws.emitJson({ id: msg.id, result: {} });
        });
      }
    };
    vi.stubGlobal("WebSocket", FakeCtor);

    const client = await CdpClient.connect("ws://127.0.0.1:9222/devtools/page/1");
    expect(await client.evaluate("21 + 21")).toBe(42);
    await expect(client.evaluate("throw new Error('boom')")).rejects.toThrow("Error: boom");

    const logs = client.getLogs({ level: "warn", clear: true });
    expect(logs).toHaveLength(1);
    expect(logs[0].text).toBe("test warning");
    expect(client.getLogs()).toHaveLength(0);

    client.close();
    expect(client.isConnected()).toBe(false);
  });
});
