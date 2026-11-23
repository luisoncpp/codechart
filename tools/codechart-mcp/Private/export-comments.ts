// @Architecture(descriptionShort="Pure formatters exporting findings and Review Notes for Markdown, GitHub, and GitLab")
import type { DiffShas } from "./diff-shas.ts";

export type ExportFormat = "markdown" | "github" | "gitlab";

export interface ExportableFinding {
  id: string;
  path: string;
  side?: "before" | "after";
  startLine: number;
  endLine: number;
  severity: string;
  title: string;
  body: string;
  blocker?: boolean;
  suggestedFix?: string | null;
  status?: string;
}

export interface ExportableNote {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  body: string;
}

export interface ExportInput {
  diffId: string | null;
  title?: string;
  summary?: string;
  findings: ExportableFinding[];
  reviewNotes: ExportableNote[];
  reviewedPaths: string[];
  unreviewedPaths: string[];
  includeReviewNotes: boolean;
  /** GitLab `position` SHAs; null/absent → payload is flagged `missingShas`. */
  diffShas?: DiffShas | null;
}

const MISSING_SHAS_WARNING = "Fill position.base_sha/start_sha/head_sha before posting";

export function formatReviewExport(format: ExportFormat, input: ExportInput): unknown {
  if (format === "github") return formatGitHub(input);
  if (format === "gitlab") return formatGitLab(input);
  return { format: "markdown", markdown: formatMarkdown(input) };
}

function formatMarkdown(input: ExportInput): string {
  const lines: string[] = [];
  lines.push(`# ${input.title || "CodeChart MR Review"}`);
  if (input.summary) lines.push("", input.summary);
  const total = input.reviewedPaths.length + input.unreviewedPaths.length;
  if (total > 0) lines.push("", `**Review progress:** ${input.reviewedPaths.length}/${total} files reviewed`);

  if (input.findings.length > 0) {
    lines.push("", "## Findings");
    for (const f of input.findings) {
      const range = f.startLine === f.endLine ? `${f.startLine}` : `${f.startLine}-${f.endLine}`;
      const tag = f.blocker ? `**[${f.severity.toUpperCase()} · BLOCKER]**` : `**[${f.severity.toUpperCase()}]**`;
      lines.push(`- ${tag} \`${f.path}:${range}\` — **${f.title}**`);
      lines.push(`  ${f.body}`);
      if (f.suggestedFix) lines.push("  ```suggestion", `  ${f.suggestedFix}`, "  ```");
    }
  }

  if (input.includeReviewNotes && input.reviewNotes.length > 0) {
    lines.push("", "## Review Notes");
    for (const n of input.reviewNotes) {
      const range = n.startLine === n.endLine ? `${n.startLine}` : `${n.startLine}-${n.endLine}`;
      lines.push(`- \`${n.path}:${range}\` — ${n.body}`);
    }
  }
  return lines.join("\n");
}

function formatGitHub(input: ExportInput) {
  const hasBlocker = input.findings.some((f) => f.blocker || f.severity === "critical");
  const comments: Array<Record<string, unknown>> = [];

  for (const f of input.findings) {
    const bodyParts = [`**[${f.severity.toUpperCase()}] ${f.title}**`, "", f.body];
    if (f.suggestedFix) bodyParts.push("", "```suggestion", f.suggestedFix, "```");
    comments.push({
      path: f.path,
      line: f.endLine,
      ...(f.startLine !== f.endLine ? { start_line: f.startLine } : {}),
      side: f.side === "before" ? "LEFT" : "RIGHT",
      body: bodyParts.join("\n"),
    });
  }

  if (input.includeReviewNotes) {
    for (const n of input.reviewNotes) {
      comments.push({
        path: n.path,
        line: n.endLine,
        ...(n.startLine !== n.endLine ? { start_line: n.startLine } : {}),
        side: "RIGHT",
        body: n.body,
      });
    }
  }

  return {
    format: "github",
    event: hasBlocker ? "REQUEST_CHANGES" : "COMMENT",
    body: input.summary || `CodeChart review (${comments.length} inline comment${comments.length === 1 ? "" : "s"}).`,
    comments,
  };
}

function formatGitLab(input: ExportInput) {
  const shas = input.diffShas ?? null;
  const discussions: Array<Record<string, unknown>> = [];
  for (const f of input.findings) {
    const bodyParts = [`**[${f.severity.toUpperCase()}] ${f.title}**${rangeSuffix(f)}`, "", f.body];
    if (f.suggestedFix) bodyParts.push("", "```suggestion:-0+0", f.suggestedFix, "```");
    discussions.push({ body: bodyParts.join("\n"), position: gitLabPosition(f, shas) });
  }
  if (input.includeReviewNotes) {
    for (const n of input.reviewNotes) {
      discussions.push({ body: `${n.body}${rangeSuffix(n)}`, position: gitLabPosition(n, shas) });
    }
  }
  const warning = shas ? shas.warning : MISSING_SHAS_WARNING;
  return {
    format: "gitlab",
    ...(shas ? {} : { missingShas: true }),
    ...(warning ? { warning } : {}),
    summaryNote: formatMarkdown(input),
    discussions,
  };
}

/** Single-line anchor at `endLine`; GitLab `line_range` needs per-line `line_code`s we can't derive. */
function gitLabPosition(
  item: { path: string; side?: "before" | "after"; endLine: number },
  shas: DiffShas | null,
) {
  return {
    position_type: "text",
    ...(shas ? { base_sha: shas.baseSha, start_sha: shas.startSha, head_sha: shas.headSha } : {}),
    old_path: item.path,
    new_path: item.path,
    ...(item.side === "before" ? { old_line: item.endLine } : { new_line: item.endLine }),
  };
}

/** Multi-line ranges keep their extent visible in the body instead of silently collapsing. */
function rangeSuffix(item: { startLine: number; endLine: number }): string {
  return item.startLine === item.endLine ? "" : ` _(lines ${item.startLine}–${item.endLine})_`;
}
