// @Architecture(descriptionShort="Headless fallback invoking codechart-cli and reading .codechart files when desktop GUI is closed")
import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

interface CliInvocation {
  command: string;
  prefixArgs: string[];
}

function resolveCli(): CliInvocation {
  const envBin = process.env.CODECHART_CLI_BIN?.trim();
  if (envBin) return { command: envBin, prefixArgs: [] };
  const ext = process.platform === "win32" ? ".exe" : "";
  const candidates = [
    join(REPO_ROOT, "src-tauri", "target", "release", `codechart-cli${ext}`),
    join(REPO_ROOT, "src-tauri", "target", "debug", `codechart-cli${ext}`),
  ].filter((p) => existsSync(p));
  if (candidates.length > 0) {
    candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    return { command: candidates[0]!, prefixArgs: [] };
  }
  return {
    command: "cargo",
    prefixArgs: [
      "run",
      "--quiet",
      "--manifest-path",
      join(REPO_ROOT, "src-tauri", "Cargo.toml"),
      "--bin",
      "codechart-cli",
      "--",
    ],
  };
}

async function runCliJson<T>(args: string[]): Promise<T> {
  const { command, prefixArgs } = resolveCli();
  const { stdout } = await execFileAsync(command, [...prefixArgs, ...args], {
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  return JSON.parse(stdout) as T;
}

export function resolveHeadlessRoot(projectRoot?: string): string {
  const candidate = projectRoot?.trim() || process.env.CODECHART_PROJECT_ROOT?.trim();
  if (!candidate) {
    throw new Error(
      "No running CodeChart desktop instance found. Pass `projectRoot` (or set CODECHART_PROJECT_ROOT) to run headlessly.",
    );
  }
  return resolve(candidate);
}

export async function headlessArchitectureSummary(projectRoot: string, groupId?: string) {
  const graph = await runCliJson<{
    root: string;
    groups: Array<{
      id: string;
      label: string;
      parentId: string | null;
      facadeModuleIds: string[];
      tags?: string[];
      annotation?: { descriptionShort?: string | null } | null;
    }>;
    modules: unknown[];
    edges: unknown[];
    diagnostics: unknown[];
  }>(["analyze", projectRoot]);

  const groups = groupId
    ? graph.groups.filter((g) => g.id === groupId || g.parentId === groupId)
    : graph.groups;
  return {
    mode: "headless",
    root: graph.root,
    groups: groups.map((g) => ({
      id: g.id,
      label: g.label,
      parentId: g.parentId,
      facadeModuleIds: g.facadeModuleIds,
      tags: g.tags ?? [],
      descriptionShort: g.annotation?.descriptionShort ?? null,
    })),
    moduleCount: graph.modules.length,
    edgeCount: graph.edges.length,
    diagnostics: graph.diagnostics,
  };
}

export async function headlessDiffImpact(args: {
  projectRoot: string;
  mode?: "commits" | "working-tree" | "paste";
  baseRef?: string;
  headRef?: string;
  diffText?: string;
  maxDepth?: number;
}) {
  const cliArgs = ["impact", args.projectRoot];
  if (args.maxDepth) cliArgs.push(`--max-depth=${args.maxDepth}`);
  if (args.mode === "paste" && args.diffText) {
    const changed = extractUnifiedDiffPaths(args.diffText);
    if (changed.length > 0) cliArgs.push(`--changed=${changed.join(",")}`);
  } else {
    if (args.baseRef) cliArgs.push(`--base=${args.baseRef}`);
    if (args.headRef) cliArgs.push(`--head=${args.headRef}`);
  }
  const report = await runCliJson<Record<string, unknown>>(cliArgs);
  return { mode: "headless", ...report };
}

export async function readHeadlessReviewState(projectRoot: string, diffId?: string, includeResolved = false) {
  const stacksPath = join(projectRoot, ".codechart", "review-stacks.json");
  const notesPath = join(projectRoot, ".codechart", "review-notes.json");
  const reviewsPath = join(projectRoot, ".codechart", "diff-reviews.json");

  const stacksDoc = await readJsonOptional<{ stacks?: Array<Record<string, unknown>> }>(stacksPath);
  const notesDoc = await readJsonOptional<{ notes?: Array<Record<string, unknown>> }>(notesPath);
  const reviewsDoc = await readJsonOptional<{ reviews?: Array<{ diffId: string; reviewedPaths: string[] }> }>(reviewsPath);

  const stacks = stacksDoc?.stacks ?? [];
  const stack = diffId ? stacks.find((s) => s.diffId === diffId) : stacks[stacks.length - 1];
  const activeDiffId = (stack?.diffId as string | undefined) ?? diffId ?? null;
  const reviewEntry = reviewsDoc?.reviews?.find((r) => r.diffId === activeDiffId);
  const rawFindings = (stack?.findings as Array<{ status?: string }> | undefined) ?? [];

  return {
    mode: "headless",
    diffId: activeDiffId,
    title: (stack?.title as string | undefined) ?? "MR Review",
    summary: (stack?.summary as string | undefined) ?? "",
    blockers: (stack?.blockers as unknown[] | undefined) ?? [],
    cohorts: (stack?.cohorts as unknown[] | undefined) ?? [],
    findings: rawFindings.filter((f) => includeResolved || f.status === "open"),
    reviewNotes: notesDoc?.notes ?? [],
    reviewedPaths: reviewEntry?.reviewedPaths ?? [],
    unreviewedPaths: [],
  };
}

async function readJsonOptional<T>(path: string): Promise<T | null> {
  const raw = await readFile(path, "utf8").catch(() => null);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function extractUnifiedDiffPaths(diffText: string): string[] {
  const paths = new Set<string>();
  for (const line of diffText.split(/\r?\n/)) {
    const raw = line.startsWith("+++ b/")
      ? line.slice(6)
      : line.startsWith("+++ ")
        ? line.slice(4)
        : null;
    if (!raw) continue;
    const clean = raw.split("\t")[0]?.trim() ?? "";
    if (clean && clean !== "/dev/null") paths.add(clean.replace(/^\.\//, ""));
  }
  return [...paths].sort();
}
