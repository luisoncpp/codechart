// @Architecture(descriptionShort="Registers real pointer, wheel, and keyboard CDP interaction tools")
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { dispatchPressKey, dispatchTypeText } from "./cdp-keyboard.ts";
import { dispatchClick, dispatchDrag, dispatchWheel } from "./cdp-pointer.ts";
import type { PlaytestSession } from "./playtest-session.ts";
import { jsonResult, wrapTool } from "./tool-helpers.ts";

function registerPointerTools(server: McpServer, session: PlaytestSession): void {
  server.registerTool(
    "click",
    {
      description: "Click or double-click at coordinates, CSS selector, or visible text",
      inputSchema: z.object({
        x: z.number().optional(),
        y: z.number().optional(),
        selector: z.string().optional(),
        text: z.string().optional(),
        button: z.enum(["left", "right", "middle"]).optional(),
        clickCount: z.number().int().min(1).max(3).optional(),
        modifiers: z.array(z.string()).optional(),
      }),
    },
    wrapTool(async (args) => jsonResult({ clicked: await dispatchClick(session.getClient(), args) })),
  );

  server.registerTool(
    "drag",
    {
      description: "Drag pointer from start coordinates/selector to target coordinates/selector",
      inputSchema: z.object({
        fromX: z.number().optional(),
        fromY: z.number().optional(),
        fromSelector: z.string().optional(),
        toX: z.number().optional(),
        toY: z.number().optional(),
        toSelector: z.string().optional(),
        steps: z.number().int().min(1).max(60).optional(),
      }),
    },
    wrapTool(async (args) => jsonResult(await dispatchDrag(session.getClient(), args))),
  );

  server.registerTool(
    "wheel",
    {
      description: "Dispatch mouse wheel zoom/scroll events at coordinates, selector, or text",
      inputSchema: z.object({
        x: z.number().optional(),
        y: z.number().optional(),
        selector: z.string().optional(),
        text: z.string().optional(),
        deltaX: z.number().optional(),
        deltaY: z.number().optional(),
        steps: z.number().int().min(1).max(30).optional(),
      }),
    },
    wrapTool(async (args) => jsonResult({ wheeled: await dispatchWheel(session.getClient(), args) })),
  );
}

function registerKeyboardTools(server: McpServer, session: PlaytestSession): void {
  server.registerTool(
    "type_text",
    {
      description: "Focus an optional target and insert text input",
      inputSchema: z.object({
        value: z.string(),
        x: z.number().optional(),
        y: z.number().optional(),
        selector: z.string().optional(),
        text: z.string().optional(),
        clearFirst: z.boolean().optional(),
      }),
    },
    wrapTool(async (args) => {
      await dispatchTypeText(session.getClient(), args);
      return jsonResult({ typedLength: args.value.length });
    }),
  );

  server.registerTool(
    "press_key",
    {
      description: "Dispatch a key press or shortcut combo (e.g. Control+Shift+f, Control+p, Escape)",
      inputSchema: z.object({ key: z.string() }),
    },
    wrapTool(async ({ key }) => {
      await dispatchPressKey(session.getClient(), key);
      return jsonResult({ pressed: key });
    }),
  );
}

export function registerInteractionTools(server: McpServer, session: PlaytestSession): void {
  registerPointerTools(server, session);
  registerKeyboardTools(server, session);
}
