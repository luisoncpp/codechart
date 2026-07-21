/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommitPanel } from "../src/features/diff_visualizer/Private/CommitPanel";
import { LOCAL_CHANGES_REF, type GitCommit } from "../src/ipc/git-client";

const commits: GitCommit[] = [
  {
    hash: "aaa1111",
    message: "Latest commit",
    date: "2026-07-06 14:30:00 -0600",
  },
  {
    hash: "bbb2222",
    message: "Earlier commit",
    date: "2026-07-05 09:15:00 -0600",
  },
];

describe("local changes commit picker", () => {
  it("shows each selected commit date beside its snapshot label", () => {
    const { rerender } = render(
      <CommitPanel
        commits={commits}
        baseRef={commits[1].hash}
        headRef={commits[0].hash}
        onBaseChange={vi.fn()}
        onHeadChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Before (2026-07-05)")).toBeInTheDocument();
    expect(screen.getByText("After (2026-07-06)")).toBeInTheDocument();

    rerender(
      <CommitPanel
        commits={commits}
        baseRef={commits[0].hash}
        headRef={LOCAL_CHANGES_REF}
        onBaseChange={vi.fn()}
        onHeadChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Before (2026-07-06)")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

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
