// @Architecture(descriptionShort="Stdio MCP server entrypoint for CodeChart MR Review")
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CodechartBridgeClient } from "./Private/bridge-client.ts";
import { registerContextTools } from "./Private/register-context-tools.ts";
import { registerStackTools } from "./Private/register-stack-tools.ts";
import { registerReviewTools } from "./Private/register-review-tools.ts";

async function main(): Promise<void> {
  const bridge = new CodechartBridgeClient();
  const server = new McpServer({ name: "codechart-review", version: "0.1.0" });

  registerContextTools(server, bridge);
  registerStackTools(server, bridge);
  registerReviewTools(server, bridge);

  const shutdown = () => process.exit(0);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.stdin.on("close", shutdown);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`codechart-mcp fatal: ${String(error)}\n`);
  process.exit(1);
});
