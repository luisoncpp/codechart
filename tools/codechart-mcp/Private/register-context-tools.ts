// @Architecture(descriptionShort="Registers context, architecture summary, and diff impact MCP tools with headless fallback")
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jsonText, type CodechartBridgeClient } from "./bridge-client.ts";
import {
  headlessArchitectureSummary,
  headlessDiffImpact,
  resolveHeadlessRoot,
} from "./headless-cli.ts";

export function registerContextTools(server: McpServer, bridge: CodechartBridgeClient): void {
  server.registerTool(
    "get_active_context",
    {
      description:
        "Inspect the active CodeChart window: open project root, zoom level, selected module/group, active diff id, reviewed count, and active cohort/blast-radius state.",
    },
    async () => jsonText(await bridge.call("get_active_context")),
  );

  server.registerTool(
    "get_architecture_summary",
    {
      description:
        "Return the analyzed ProjectGraph group hierarchy, facades, tags, module/edge counts, and current architecture diagnostics. Falls back to headless codechart-cli when the desktop window is closed if projectRoot is provided.",
      inputSchema: {
        groupId: z.string().optional().describe("Optional group id to scope the summary."),
        projectRoot: z
          .string()
          .optional()
          .describe("Optional project directory for headless fallback when CodeChart GUI is closed."),
      },
    },
    async (args) => {
      try {
        return jsonText(await bridge.call("get_architecture_summary", args));
      } catch (liveErr) {
        if (!args.projectRoot && !process.env.CODECHART_PROJECT_ROOT) throw liveErr;
        const root = resolveHeadlessRoot(args.projectRoot);
        return jsonText(await headlessArchitectureSummary(root, args.groupId));
      }
    },
  );

  server.registerTool(
    "analyze_diff_impact",
    {
      description:
        "Compute foundation-first topological layers of changed modules, transitive blast radius (downstream dependents with hop depth), and newly introduced architecture diagnostics. Falls back to headless codechart-cli when the desktop window is closed if projectRoot is provided.",
      inputSchema: {
        mode: z.enum(["commits", "working-tree", "paste"]).optional(),
        baseRef: z.string().optional().describe("Git base ref (for commits or working-tree mode)."),
        headRef: z.string().optional().describe("Git head ref (for commits mode)."),
        diffText: z.string().optional().describe("Unified diff text (for paste mode)."),
        maxDepth: z.number().int().min(1).max(8).optional().describe("Max reverse-BFS hops (default 3)."),
        projectRoot: z
          .string()
          .optional()
          .describe("Optional project directory for headless fallback when CodeChart GUI is closed."),
      },
    },
    async (args) => {
      try {
        return jsonText(await bridge.call("analyze_diff_impact", args));
      } catch (liveErr) {
        if (!args.projectRoot && !process.env.CODECHART_PROJECT_ROOT) throw liveErr;
        const root = resolveHeadlessRoot(args.projectRoot);
        return jsonText(
          await headlessDiffImpact({
            projectRoot: root,
            mode: args.mode,
            baseRef: args.baseRef,
            headRef: args.headRef,
            diffText: args.diffText,
            maxDepth: args.maxDepth,
          }),
        );
      }
    },
  );
}
