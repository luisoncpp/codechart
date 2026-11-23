// @Architecture(descriptionShort="Resolves GitLab diff-note base/start/head SHAs from a CodeChart diffId via git")
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** GitLab Discussions API `position` SHAs. `warning` explains SHAs that can't anchor real diff lines. */
export interface DiffShas {
  baseSha: string;
  startSha: string;
  headSha: string;
  warning?: string;
}

export interface DiffShaRequest {
  root: string | null;
  diffId: string | null;
  provided?: Partial<DiffShas>;
}

const WORKING_TREE_WARNING =
  "Working-tree diff: GitLab cannot comment on uncommitted code. head_sha is the base ref; commit and push, then re-export with headSha.";

/**
 * Caller-provided SHAs win; missing ones come from the diffId
 * (`commits:<base>..<head>`, `working-tree:<base>`). Paste diffs carry no refs.
 * Null when any of the three is still unknown.
 */
export async function resolveDiffShas(req: DiffShaRequest): Promise<DiffShas | null> {
  const resolved = req.root ? await shasFromDiffId(req.root, req.diffId) : null;
  const provided = req.provided ?? {};
  const baseSha = provided.baseSha || resolved?.baseSha;
  const startSha = provided.startSha || resolved?.startSha;
  const headSha = provided.headSha || resolved?.headSha;
  if (!baseSha || !startSha || !headSha) return null;
  const warning = provided.headSha ? undefined : resolved?.warning;
  return { baseSha, startSha, headSha, ...(warning ? { warning } : {}) };
}

async function shasFromDiffId(root: string, diffId: string | null): Promise<Partial<DiffShas> | null> {
  if (diffId?.startsWith("commits:")) {
    const [base, head] = diffId.slice("commits:".length).split("..");
    if (!base || !head) return null;
    const [startSha, headSha, baseSha] = await Promise.all([
      git(root, ["rev-parse", "--verify", `${base}^{commit}`]),
      git(root, ["rev-parse", "--verify", `${head}^{commit}`]),
      git(root, ["merge-base", base, head]),
    ]);
    return { baseSha, startSha, headSha };
  }
  if (diffId?.startsWith("working-tree:")) {
    const sha = await git(root, ["rev-parse", "--verify", `${diffId.slice("working-tree:".length)}^{commit}`]);
    return { baseSha: sha, startSha: sha, headSha: sha, warning: WORKING_TREE_WARNING };
  }
  return null;
}

/** Trimmed stdout, or undefined when git fails (not a repo, unknown ref). */
async function git(root: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, ...args], { windowsHide: true });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}
