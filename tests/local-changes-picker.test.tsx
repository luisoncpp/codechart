/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommitPanel } from "../src/features/diff_visualizer/Private/CommitPanel";
import { LOCAL_CHANGES_REF, type GitCommit } from "../src/ipc/git-client";

const commits: GitCommit[] = [
  { hash: "aaa1111", message: "Latest commit", date: "2026-07-06" },
  { hash: "bbb2222", message: "Earlier commit", date: "2026-07-05" },
];

describe("local changes commit picker", () => {
  it("offers Local changes as an after revision and defaults before to HEAD", () => {
    const onBaseChange = vi.fn();
    const onHeadChange = vi.fn();
    render(
      <CommitPanel
        commits={commits}
        baseRef=""
        headRef=""
        onBaseChange={onBaseChange}
        onHeadChange={onHeadChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Pick newer commit/ }));
    fireEvent.click(screen.getByRole("button", { name: "Local changes" }));

    expect(onHeadChange).toHaveBeenCalledWith(LOCAL_CHANGES_REF);
    expect(onBaseChange).toHaveBeenCalledWith(commits[0].hash);
  });
});
