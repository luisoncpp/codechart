// @Architecture(descriptionShort="Subscribes to Tauri mcp-bridge-request events and returns typed RPC replies")
import { useEffect, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import type { BridgeRpcRequest } from "../../ipc/review-stack-client";
import { McpBridgeHandler, type McpBridgeDeps } from "./mcp-bridge-handler";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function useMcpBridge(deps: McpBridgeDeps) {
  const { session, reviewNotes, reviewStack, client } = deps;
  const handler = useMemo(
    /*buildMcpBridgeHandler*/ () => new McpBridgeHandler({ session, reviewNotes, reviewStack, client }),
    [session, reviewNotes, reviewStack, client],
  );

  useEffect(/*listenForMcpBridgeRequests*/ () => {
    if (!isTauriRuntime()) return;
    let active = true;
    let unlisten: (() => void) | null = null;
    void listen<BridgeRpcRequest>("mcp-bridge-request", (event) => {
      const req = event.payload;
      void handler
        .handle(req)
        .then((result) => client.respondToBridge(req.id, result, null))
        .catch((err) =>
          client.respondToBridge(
            req.id,
            null,
            err instanceof Error ? err.message : String(err),
          ),
        );
    }).then((fn) => {
      if (active) unlisten = fn;
      else fn();
    });
    return () => {
      active = false;
      unlisten?.();
    };
  }, [handler, client]);
}
