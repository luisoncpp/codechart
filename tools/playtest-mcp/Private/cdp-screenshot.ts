// @Architecture(descriptionShort="Viewport and element PNG screenshot capture over CDP")
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CdpClient } from "./cdp-client.ts";
import { resolveElementClip } from "./cdp-dom.ts";
import type { ClipRect, ScreenshotOptions } from "./types.ts";

export interface ScreenshotResult {
  base64: string;
  savedPath?: string;
  clip?: ClipRect;
}

async function resolveClip(cdp: CdpClient, options?: ScreenshotOptions): Promise<ClipRect | undefined> {
  if (options?.clip) return options.clip;
  if (options?.selector) return resolveElementClip(cdp, options.selector);
  if (!options?.fullPage) return undefined;
  const metrics = await cdp.send<{ cssContentSize?: { width: number; height: number } }>(
    "Page.getLayoutMetrics",
  );
  if (!metrics.cssContentSize) return undefined;
  return {
    x: 0,
    y: 0,
    width: Math.max(1, Math.ceil(metrics.cssContentSize.width)),
    height: Math.max(1, Math.ceil(metrics.cssContentSize.height)),
    scale: 1,
  };
}

export async function captureScreenshot(
  cdp: CdpClient,
  options?: ScreenshotOptions,
): Promise<ScreenshotResult> {
  const clip = await resolveClip(cdp, options);
  const params: Record<string, unknown> = { format: "png" };
  if (clip) params.clip = { ...clip, scale: clip.scale ?? 1 };
  if (options?.fullPage) params.captureBeyondViewport = true;

  const { data } = await cdp.send<{ data: string }>("Page.captureScreenshot", params);
  let savedPath: string | undefined;
  if (options?.savePath) {
    savedPath = resolve(options.savePath);
    await mkdir(dirname(savedPath), { recursive: true });
    await writeFile(savedPath, Buffer.from(data, "base64"));
  }
  return { base64: data, savedPath, clip };
}
