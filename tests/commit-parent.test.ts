import { describe, expect, it } from "vitest";
import { parentCommitHash } from "../src/features/diff_visualizer/Private/commit-parent";
import type { GitCommit } from "../src/ipc/git-client";

const commits: GitCommit[] = [
  { hash: "aaa", message: "newest", date: "2026-01-03" },
  { hash: "bbb", message: "middle", date: "2026-01-02" },
  { hash: "ccc", message: "oldest", date: "2026-01-01" },
];

describe("parentCommitHash", () => {
  it("returns the next commit in log order", () => {
    expect(parentCommitHash(commits, "aaa")).toBe("bbb");
    expect(parentCommitHash(commits, "bbb")).toBe("ccc");
  });

  it("returns null when there is no parent in the loaded list", () => {
    expect(parentCommitHash(commits, "ccc")).toBeNull();
    expect(parentCommitHash(commits, "missing")).toBeNull();
  });
});
