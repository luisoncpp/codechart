// @Architecture(descriptionShort="Before/after commit pickers for git diff mode")
import {
  LOCAL_CHANGES_REF,
  type GitCommit,
} from "../../../ipc/git-client";
import { CommitSearchSelect } from "./CommitSearchSelect";
import { parentCommitHash } from "./commit-parent";

interface CommitPanelProps {
  commits: GitCommit[];
  baseRef: string;
  headRef: string;
  ignoreSubmodules: boolean;
  onBaseChange: (value: string) => void;
  onHeadChange: (value: string) => void;
  onIgnoreSubmodulesChange: (value: boolean) => void;
}

export function CommitPanel({
  commits,
  baseRef,
  headRef,
  ignoreSubmodules,
  onBaseChange,
  onHeadChange,
  onIgnoreSubmodulesChange,
}: CommitPanelProps) {
  const handleHeadChange = (hash: string) => {
    onHeadChange(hash);
    if (!hash || baseRef) return;
    if (hash === LOCAL_CHANGES_REF) {
      if (commits[0]) onBaseChange(commits[0].hash);
      return;
    }
    const parent = parentCommitHash(commits, hash);
    if (parent) onBaseChange(parent);
  };

  const afterCommits: GitCommit[] = [
    { hash: LOCAL_CHANGES_REF, message: "Local changes", date: "" },
    ...commits,
  ];

  return (
    <div>
      <div style={rowStyle}>
        <CommitSearchSelect
          label="Before"
          value={baseRef}
          commits={commits}
          onChange={onBaseChange}
          placeholder="Pick older commit…"
        />
        <span aria-hidden style={arrowStyle}>→</span>
        <CommitSearchSelect
          label="After"
          value={headRef}
          commits={afterCommits}
          onChange={handleHeadChange}
          placeholder="Pick newer commit…"
        />
      </div>
      {headRef === LOCAL_CHANGES_REF && (
        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={ignoreSubmodules}
            onChange={(e) => onIgnoreSubmodulesChange(e.target.checked)}
          />
          Exclude submodules
        </label>
      )}
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
};

const arrowStyle: React.CSSProperties = {
  flexShrink: 0,
  paddingBottom: 10,
  fontSize: 16,
  color: "#94a3b8",
};

const checkboxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 10,
  fontSize: 13,
  color: "#475569",
};
