// @Architecture(descriptionShort="Discovers live CodeChart desktop instance and sends authenticated loopback RPC calls")
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface InstanceEntry {
  pid: number;
  port: number;
  token: string;
  startedAtMs: number;
}

interface InstancesRegistry {
  version: number;
  instances: InstanceEntry[];
}

export class CodechartBridgeClient {
  private cached: InstanceEntry | null = null;

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const instance = await this.resolveInstance();
    const res = await fetch(`http://127.0.0.1:${instance.port}/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instance.token}`,
      },
      body: JSON.stringify({ id: randomUUID(), method, params }),
    }).catch((err) => {
      this.cached = null;
      throw new Error(`Failed to reach CodeChart desktop bridge: ${String(err)}`);
    });

    const payload = (await res.json()) as { ok: boolean; result?: T; error?: string };
    if (!res.ok || !payload.ok) {
      if (res.status === 401) this.cached = null;
      throw new Error(payload.error ?? `Bridge HTTP ${res.status}`);
    }
    return payload.result as T;
  }

  private async resolveInstance(): Promise<InstanceEntry> {
    if (this.cached && (await isHealthy(this.cached.port))) return this.cached;
    this.cached = null;
    const registryPath =
      process.env.CODECHART_MCP_REGISTRY?.trim() || join(homedir(), ".codechart", "instances.json");
    const raw = await readFile(registryPath, "utf8").catch(() => null);
    if (!raw) {
      throw new Error(
        `No running CodeChart desktop instance found (${registryPath} missing). Open CodeChart first.`,
      );
    }
    const parsed = JSON.parse(raw) as InstancesRegistry;
    const sorted = [...(parsed.instances ?? [])].sort((a, b) => b.startedAtMs - a.startedAtMs);
    for (const entry of sorted) {
      if (await isHealthy(entry.port)) {
        this.cached = entry;
        return entry;
      }
    }
    throw new Error("No live CodeChart desktop instance responded on loopback. Open CodeChart first.");
  }
}

async function isHealthy(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function jsonText(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
