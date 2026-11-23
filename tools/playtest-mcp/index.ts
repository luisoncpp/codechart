// @Architecture(descriptionShort="Stdio MCP server entrypoint for Codechart playtesting")
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PlaytestSession } from "./Private/playtest-session.ts";
import { registerInteractionTools } from "./Private/register-interaction-tools.ts";
import { registerCoreTools } from "./Private/register-tools.ts";

async function main(): Promise<void> {
  const session = new PlaytestSession();
  const server = new McpServer({ name: "codechart-playtest", version: "0.1.0" });

  registerCoreTools(server, session);
  registerInteractionTools(server, session);

  let cleaningUp = false;
  const shutdown = async () => {
    if (cleaningUp) return;
    cleaningUp = true;
    await session.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  process.stdin.on("close", () => void shutdown());

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`codechart-playtest fatal: ${String(error)}\n`);
  process.exit(1);
});
