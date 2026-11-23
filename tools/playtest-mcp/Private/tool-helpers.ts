// @Architecture(descriptionShort="Shared MCP tool response formatting and error wrapper")
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export function wrapTool<T>(handler: (args: T) => Promise<CallToolResult>) {
  return async (args: T): Promise<CallToolResult> => {
    try {
      return await handler(args);
    } catch (error) {
      return errorResult(error);
    }
  };
}
