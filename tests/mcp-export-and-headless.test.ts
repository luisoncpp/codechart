import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { formatReviewExport, type ExportInput } from "../tools/codechart-mcp/Private/export-comments.ts";
import { extractUnifiedDiffPaths } from "../tools/codechart-mcp/Private/headless-cli.ts";
import { resolveDiffShas } from "../tools/codechart-mcp/Private/diff-shas.ts";

const SAMPLE_INPUT: ExportInput = {
  diffId: "commits:a..b",
  title: "Add invitations",
  summary: "Adds invite flow.",
  findings: [
    {
      id: "f1",
      path: "src/api.ts",
      side: "after",
      startLine: 10,
      endLine: 12,
      severity: "critical",
      title: "Check expiry",
      body: "Validate expiresAt.",
      blocker: true,
      suggestedFix: "if (expired) throw new Error();",
      status: "open",
    },
  ],
  reviewNotes: [
    { id: "n1", path: "src/ui.ts", startLine: 4, endLine: 4, body: "Confirm empty state copy." },
  ],
  reviewedPaths: ["src/api.ts"],
  unreviewedPaths: ["src/ui.ts"],
  includeReviewNotes: true,
};

describe("export_review_comments formatters", () => {
  it("formats markdown, github, and gitlab payloads cleanly", () => {
    const md = formatReviewExport("markdown", SAMPLE_INPUT) as { markdown: string };
    expect(md.markdown).toContain("# Add invitations");
    expect(md.markdown).toContain("1/2 files reviewed");
    expect(md.markdown).toContain("src/api.ts:10-12");
    expect(md.markdown).toContain("Confirm empty state copy.");

    const gh = formatReviewExport("github", SAMPLE_INPUT) as {
      event: string;
      comments: Array<{ path: string; line: number; start_line?: number; side: string; body: string }>;
    };
    expect(gh.event).toBe("REQUEST_CHANGES");
    expect(gh.comments).toHaveLength(2);
    expect(gh.comments[0]).toMatchObject({ path: "src/api.ts", line: 12, start_line: 10, side: "RIGHT" });
    expect(gh.comments[0]?.body).toContain("```suggestion");

    const gl = formatReviewExport("gitlab", SAMPLE_INPUT) as {
      summaryNote: string;
      discussions: Array<{ body: string; position: { new_path: string; new_line?: number } }>;
    };
    expect(gl.discussions).toHaveLength(2);
    expect(gl.discussions[0]?.position).toMatchObject({ new_path: "src/api.ts", new_line: 12 });
    expect(gl.discussions[0]?.body).toContain("```suggestion:-0+0");
  });

  it("adds base/start/head SHAs to every GitLab position when known", () => {
    const shas = { baseSha: "b".repeat(40), startSha: "s".repeat(40), headSha: "h".repeat(40) };
    const gl = formatReviewExport("gitlab", { ...SAMPLE_INPUT, diffShas: shas }) as {
      missingShas?: boolean;
      discussions: Array<{ body: string; position: Record<string, unknown> }>;
    };
    for (const d of gl.discussions) {
      expect(d.position).toMatchObject({ base_sha: shas.baseSha, start_sha: shas.startSha, head_sha: shas.headSha });
    }
    expect(gl.missingShas).toBeUndefined();
    expect(gl.discussions[0]?.body).toContain("lines 10–12");
  });

  it("flags missing SHAs instead of emitting unpostable GitLab positions silently", () => {
    const gl = formatReviewExport("gitlab", SAMPLE_INPUT) as { missingShas?: boolean; warning?: string };
    expect(gl.missingShas).toBe(true);
    expect(gl.warning).toBe("Fill position.base_sha/start_sha/head_sha before posting");
  });

  it("resolves GitLab SHAs from commit and working-tree diff ids", async () => {
    const root = resolve(".");
    const commits = await resolveDiffShas({ root, diffId: "commits:HEAD~1..HEAD" });
    expect(commits?.headSha).toMatch(/^[0-9a-f]{40}$/);
    expect(commits?.startSha).toMatch(/^[0-9a-f]{40}$/);
    expect(commits?.baseSha).toMatch(/^[0-9a-f]{40}$/);
    expect(commits?.warning).toBeUndefined();
    const wt = await resolveDiffShas({ root, diffId: "working-tree:HEAD" });
    expect(wt?.headSha).toBe(wt?.baseSha);
    expect(wt?.warning).toMatch(/uncommitted/i);
    expect(await resolveDiffShas({ root, diffId: "paste:abc" })).toBeNull();
    const given = { baseSha: "1", startSha: "2", headSha: "3" };
    expect(await resolveDiffShas({ root: null, diffId: "paste:abc", provided: given })).toEqual(given);
  });

  it("extracts changed paths from unified diff text", () => {
    const diff = "--- a/src/a.ts\n+++ b/src/a.ts\n--- a/src/old.ts\n+++ /dev/null\n";
    expect(extractUnifiedDiffPaths(diff)).toEqual(["src/a.ts"]);
  });
});

describe("codechart-mcp headless stdio E2E", () => {
  it("answers architecture summary, diff impact, and export_review_comments with no GUI running", async () => {
    const fixture = resolve("tests/fixtures/ts-basic-project");
    const tempDir = mkdtempSync(join(tmpdir(), "codechart-headless-e2e-"));
    mkdirSync(join(tempDir, ".codechart"), { recursive: true });
    writeFileSync(
      join(tempDir, ".codechart", "review-stacks.json"),
      JSON.stringify({
        version: 1,
        stacks: [{
          diffId: "paste:test",
          title: "Headless MR",
          summary: "Summary text",
          cohorts: [],
          blockers: [],
          findings: SAMPLE_INPUT.findings,
        }],
      }),
    );
    writeFileSync(
      join(tempDir, ".codechart", "review-notes.json"),
      JSON.stringify({ version: 1, notes: SAMPLE_INPUT.reviewNotes }),
    );

    const transport = new StdioClientTransport({
      command: "node",
      args: [resolve("tools/codechart-mcp/index.ts")],
      env: {
        ...process.env,
        CODECHART_MCP_REGISTRY: join(tempDir, "no-gui-instances.json"),
      } as Record<string, string>,
    });
    const client = new Client({ name: "headless-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const list = await client.listTools();
      expect(list.tools.map((t) => t.name)).toContain("export_review_comments");

      const archRes = await client.callTool({
        name: "get_architecture_summary",
        arguments: { projectRoot: fixture },
      });
      const arch = JSON.parse((archRes.content as Array<{ text: string }>)[0]!.text);
      expect(arch.mode).toBe("headless");
      expect(arch.moduleCount).toBe(13);

      const impactRes = await client.callTool({
        name: "analyze_diff_impact",
        arguments: {
          projectRoot: fixture,
          mode: "paste",
          diffText: "--- a/src/core/todo.ts\n+++ b/src/core/todo.ts\n@@ -1 +1 @@\n-a\n+b\n",
        },
      });
      const impact = JSON.parse((impactRes.content as Array<{ text: string }>)[0]!.text);
      expect(impact.mode).toBe("headless");
      expect(impact.layers[0].moduleIds).toEqual(["src/core/todo.ts"]);
      expect(impact.blastRadius.length).toBeGreaterThan(0);

      const expRes = await client.callTool({
        name: "export_review_comments",
        arguments: { format: "gitlab", projectRoot: tempDir },
      });
      const exported = JSON.parse((expRes.content as Array<{ text: string }>)[0]!.text);
      expect(exported.format).toBe("gitlab");
      expect(exported.discussions).toHaveLength(2);
      expect(exported.missingShas).toBe(true);
    } finally {
      await client.close().catch(() => {});
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 20_000);
});
