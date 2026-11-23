// @Architecture(descriptionShort="Registers human review-state tools, MR comment export, and passive MCP resources")
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jsonText, type CodechartBridgeClient } from "./bridge-client.ts";
import {
  formatReviewExport,
  type ExportableFinding,
  type ExportableNote,
} from "./export-comments.ts";
import { readHeadlessReviewState, resolveHeadlessRoot } from "./headless-cli.ts";
import { resolveDiffShas } from "./diff-shas.ts";

interface LiveReviewState {
  diffId: string | null;
  reviewedPaths: string[];
  unreviewedPaths: string[];
  reviewNotes: ExportableNote[];
  findings: ExportableFinding[];
}

export function registerReviewTools(server: McpServer, bridge: CodechartBridgeClient): void {
  server.registerTool(
    "get_review_state",
    {
      description:
        "Read reviewed/unreviewed diff paths, human-authored Review Notes, cohorts, and finding statuses from CodeChart.",
      inputSchema: {
        includeResolved: z.boolean().optional().describe("Include resolved/dismissed findings."),
      },
    },
    async (args) => jsonText(await bridge.call("get_review_state", args)),
  );

  server.registerTool(
    "set_files_reviewed",
    {
      description: "Mark one or more diffed file paths as reviewed or unreviewed in CodeChart.",
      inputSchema: {
        paths: z.array(z.string()),
        reviewed: z.boolean(),
      },
    },
    async (args) => jsonText(await bridge.call("set_files_reviewed", args)),
  );

  server.registerTool(
    "resolve_finding",
    {
      description: "Update the status of a Review Stack finding (open, resolved, or dismissed).",
      inputSchema: {
        findingId: z.string(),
        status: z.enum(["open", "resolved", "dismissed"]),
      },
    },
    async (args) => jsonText(await bridge.call("resolve_finding", args)),
  );

  server.registerTool(
    "export_review_comments",
    {
      description:
        "Export unresolved findings and human Review Notes formatted for Markdown, GitHub PR Reviews API, or GitLab MR Discussions API. Works both with a live CodeChart window and headlessly via projectRoot.",
      inputSchema: {
        format: z.enum(["markdown", "github", "gitlab"]).default("markdown"),
        includeResolved: z.boolean().optional().default(false),
        includeReviewNotes: z.boolean().optional().default(true),
        projectRoot: z.string().optional().describe("Optional project root for headless disk read."),
        diffId: z.string().optional().describe("Optional diffId when reading headlessly."),
        baseSha: z.string().optional().describe("GitLab position.base_sha (default: merge-base from the diffId refs)."),
        startSha: z.string().optional().describe("GitLab position.start_sha (default: the diff's base ref)."),
        headSha: z.string().optional().describe("GitLab position.head_sha (default: the diff's head ref)."),
      },
    },
    async (args) => {
      const { state, root } = await loadExportState(bridge, args);
      const diffShas =
        args.format === "gitlab"
          ? await resolveDiffShas({
              root,
              diffId: state.diffId,
              provided: { baseSha: args.baseSha, startSha: args.startSha, headSha: args.headSha },
            })
          : null;
      return jsonText(
        formatReviewExport(args.format, {
          diffShas,
          diffId: state.diffId,
          title: state.title,
          summary: state.summary,
          findings: state.findings,
          reviewNotes: state.reviewNotes,
          reviewedPaths: state.reviewedPaths,
          unreviewedPaths: state.unreviewedPaths,
          includeReviewNotes: args.includeReviewNotes,
        }),
      );
    },
  );

  server.registerResource(
    "active-session",
    "codechart://session/active",
    { description: "Live snapshot of the active CodeChart window context", mimeType: "application/json" },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await bridge.call("get_active_context"), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "review-notes",
    "codechart://review/notes",
    { description: "Current human Review Notes, findings, and reviewed-file progress", mimeType: "application/json" },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await bridge.call("get_review_state", { includeResolved: true }), null, 2),
        },
      ],
    }),
  );
}

type ExportState = LiveReviewState & { title?: string; summary?: string };

/** Live review state (+ the window's project root), else the headless `.codechart/` files. */
async function loadExportState(
  bridge: CodechartBridgeClient,
  args: { includeResolved: boolean; projectRoot?: string; diffId?: string },
): Promise<{ state: ExportState; root: string | null }> {
  const fallbackRoot = args.projectRoot || process.env.CODECHART_PROJECT_ROOT || null;
  try {
    const state = await bridge.call<ExportState>("get_review_state", { includeResolved: args.includeResolved });
    const context = await bridge
      .call<{ projectRoot?: string | null }>("get_active_context")
      .catch(/*noLiveRoot*/ () => null);
    return { state, root: context?.projectRoot || fallbackRoot };
  } catch (liveErr) {
    if (!fallbackRoot) throw liveErr;
    const root = resolveHeadlessRoot(fallbackRoot);
    const state = await readHeadlessReviewState(root, args.diffId, args.includeResolved);
    return { state: state as unknown as ExportState, root };
  }
}
