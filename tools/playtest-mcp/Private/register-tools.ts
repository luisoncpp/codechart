// @Architecture(descriptionShort="Registers lifecycle, inspection, screenshot, and bridge MCP tools")
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { queryDom } from "./cdp-dom.ts";
import { captureScreenshot } from "./cdp-screenshot.ts";
import type { PlaytestSession } from "./playtest-session.ts";
import { jsonResult, wrapTool } from "./tool-helpers.ts";

function registerLifecycleTools(server: McpServer, session: PlaytestSession): void {
  server.registerTool(
    "launch_app",
    {
      description: "Launch Codechart Tauri app with WebView2 CDP and an optional project path",
      inputSchema: z.object({
        projectPath: z.string().optional(),
        width: z.number().int().min(320).max(7680).optional(),
        height: z.number().int().min(240).max(4320).optional(),
        cdpPort: z.number().int().min(1024).max(65535).optional(),
        timeoutMs: z.number().int().min(1000).optional(),
        waitForReady: z.boolean().optional(),
      }),
    },
    wrapTool(async (args) => jsonResult(await session.launch(args))),
  );

  server.registerTool(
    "connect_app",
    {
      description: "Attach to an already-running Codechart WebView2 CDP port",
      inputSchema: z.object({ port: z.number().int().min(1).max(65535) }),
    },
    wrapTool(async ({ port }) => jsonResult(await session.connect(port))),
  );

  server.registerTool(
    "close_app",
    {
      description: "Close the playtest Codechart process and clean up temporary WebView2 profile",
      inputSchema: z.object({}),
    },
    wrapTool(async () => jsonResult(await session.close())),
  );
}

function registerInspectionTools(server: McpServer, session: PlaytestSession): void {
  server.registerTool(
    "screenshot",
    {
      description: "Capture a PNG screenshot of the Codechart window or a CSS selector",
      inputSchema: z.object({
        selector: z.string().optional(),
        fullPage: z.boolean().optional(),
        savePath: z.string().optional(),
        clip: z
          .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
          .optional(),
      }),
    },
    wrapTool(async (args) => {
      const shot = await captureScreenshot(session.getClient(), args);
      const meta = { savedPath: shot.savedPath, clip: shot.clip };
      return {
        content: [
          { type: "image", data: shot.base64, mimeType: "image/png" },
          { type: "text", text: JSON.stringify(meta) },
        ],
      };
    }),
  );

  server.registerTool(
    "get_state",
    {
      description: "Return live Codechart graph session, viewport, diff, heatmap, and inspector state",
      inputSchema: z.object({}),
    },
    wrapTool(async () => jsonResult(await session.getState())),
  );

  server.registerTool(
    "query_dom",
    {
      description: "Inspect visible DOM elements and screen bounding boxes for a CSS selector",
      inputSchema: z.object({
        selector: z.string(),
        limit: z.number().int().min(1).max(200).optional(),
        visibleOnly: z.boolean().optional(),
      }),
    },
    wrapTool(async (args) => jsonResult(await queryDom(session.getClient(), args))),
  );

  server.registerTool(
    "get_console_logs",
    {
      description: "Read buffered WebView console messages and uncaught exceptions",
      inputSchema: z.object({ level: z.string().optional(), clear: z.boolean().optional() }),
    },
    wrapTool(async (args) => jsonResult(session.getClient().getLogs(args))),
  );
}

function registerBridgeAndEvalTools(server: McpServer, session: PlaytestSession): void {
  server.registerTool(
    "codechart_action",
    {
      description: "Invoke a dev-only window.__codechartPlaytest helper action",
      inputSchema: z.object({
        action: z.enum([
          "open_project",
          "wait_for_ready",
          "focus_module",
          "set_viewport",
          "fit_view",
          "set_zoom_level",
          "apply_diff_paste",
          "clear_diff",
          "resize_window",
          "list_nodes",
        ]),
        path: z.string().optional(),
        timeoutMs: z.number().int().min(100).optional(),
        moduleId: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        zoom: z.number().positive().optional(),
        zoomLevel: z.union([z.literal(0), z.literal(1), z.literal(1.5), z.literal(2)]).optional(),
        diffText: z.string().optional(),
        width: z.number().min(320).max(7680).optional(),
        height: z.number().min(240).max(4320).optional(),
      }),
    },
    wrapTool(async ({ action, ...args }) => jsonResult(await session.runBridgeAction(action, args))),
  );

  server.registerTool(
    "eval_js",
    {
      description: "Evaluate a JavaScript expression inside the Codechart WebView",
      inputSchema: z.object({
        expression: z.string(),
        awaitPromise: z.boolean().optional(),
      }),
    },
    wrapTool(async ({ expression, awaitPromise }) =>
      jsonResult({ value: await session.getClient().evaluate(expression, awaitPromise ?? true) }),
    ),
  );
}

export function registerCoreTools(server: McpServer, session: PlaytestSession): void {
  registerLifecycleTools(server, session);
  registerInspectionTools(server, session);
  registerBridgeAndEvalTools(server, session);
}
