// @Architecture(descriptionShort="Registers diff loading, Review Stack authoring, findings, and canvas navigation MCP tools")
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jsonText, type CodechartBridgeClient } from "./bridge-client.ts";

const cohortSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string().default(""),
  dependsOn: z.array(z.string()).default([]),
  moduleIds: z.array(z.string()).default([]),
});

const blockerSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  findingId: z.string().nullable().optional(),
  moduleId: z.string().nullable().optional(),
});

const findingSchema = z.object({
  id: z.string(),
  path: z.string(),
  side: z.enum(["before", "after"]).default("after"),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  severity: z.enum(["critical", "major", "minor", "trivial", "info"]),
  category: z.string().default("review"),
  title: z.string(),
  body: z.string(),
  layerId: z.string().nullable().optional(),
  blocker: z.boolean().default(false),
  suggestedFix: z.string().nullable().optional(),
  status: z.enum(["open", "resolved", "dismissed"]).default("open"),
});

export function registerStackTools(server: McpServer, bridge: CodechartBridgeClient): void {
  server.registerTool(
    "load_diff",
    {
      description: "Load a git commit diff, working-tree diff, or pasted unified diff onto the CodeChart canvas.",
      inputSchema: {
        mode: z.enum(["commits", "working-tree", "paste"]),
        baseRef: z.string().optional(),
        headRef: z.string().optional(),
        diffText: z.string().optional(),
      },
    },
    async (args) => jsonText(await bridge.call("load_diff", args)),
  );

  server.registerTool(
    "set_review_stack",
    {
      description:
        "Populate and persist the Change Stack drawer for the active diff (summary, dependency-ordered cohorts/layers, and merge blockers).",
      inputSchema: {
        title: z.string(),
        summary: z.string().default(""),
        cohorts: z.array(cohortSchema),
        blockers: z.array(blockerSchema).default([]),
      },
    },
    async (args) => jsonText(await bridge.call("set_review_stack", args)),
  );

  server.registerTool(
    "upsert_findings",
    {
      description:
        "Attach or update structured severity-badged findings anchored to file/line ranges (rendered inline in CodeChart preview frames and the Findings tab).",
      inputSchema: { findings: z.array(findingSchema) },
    },
    async (args) => jsonText(await bridge.call("upsert_findings", args)),
  );

  server.registerTool(
    "clear_review_stack",
    { description: "Clear the persisted Review Stack and findings for the active diff." },
    async () => jsonText(await bridge.call("clear_review_stack")),
  );

  server.registerTool(
    "focus_layer",
    {
      description: "Spotlight a cohort/layer on the CodeChart canvas and focus its first module.",
      inputSchema: {
        cohortId: z.string().nullable().describe("Cohort id to spotlight, or null to clear spotlight."),
        spotlight: z.enum(["dim-others", "highlight", "off"]).optional(),
      },
    },
    async (args) => jsonText(await bridge.call("focus_layer", args)),
  );

  server.registerTool(
    "show_blast_radius",
    {
      description: "Compute and highlight downstream transitive dependents on the CodeChart canvas with hop-depth badges.",
      inputSchema: {
        moduleId: z.string().optional().describe("Seed module id (omit to use all changed diff modules)."),
        maxDepth: z.number().int().min(1).max(8).optional(),
      },
    },
    async (args) => jsonText(await bridge.call("show_blast_radius", args)),
  );

  server.registerTool(
    "navigate_to",
    {
      description: "Center the canvas on a module and optionally open its Preview Frame scrolled to a specific line.",
      inputSchema: {
        path: z.string(),
        line: z.number().int().min(1).optional(),
        symbol: z.string().optional(),
        openPreview: z.boolean().optional(),
      },
    },
    async (args) => jsonText(await bridge.call("navigate_to", args)),
  );
}
