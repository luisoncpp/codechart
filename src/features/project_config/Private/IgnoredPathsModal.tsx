// @Architecture(descriptionShort="Modal for editing project-scoped ignored directories")
import { useState } from "react";
import {
  writeIgnoredPaths,
  type ProjectConfigClient,
} from "../../../ipc/project-config-client";
import { labelStyle } from "./config-modal-styles";
import { ConfigModalShell } from "./ConfigModalShell";
import { PathList } from "./UnrealConfigModalParts";
import { useConfigModalState } from "./use-config-modal-state";

interface IgnoredPathsModalProps {
  open: boolean;
  root: string | null;
  client: ProjectConfigClient;
  onClose: () => void;
  onSaved: () => void;
}

export function IgnoredPathsModal({
  open,
  root,
  client,
  onClose,
  onSaved,
}: IgnoredPathsModalProps) {
  const [paths, setPaths] = useState<string[]>([]);
  // `writeIgnoredPaths` read-modify-writes, so saving never clobbers
  // `editor` or `unreal`.
  const { state, commit } = useConfigModalState({
    open,
    root,
    client,
    io: {
      load: (config) => setPaths(config.ignoredPaths ?? []),
      save: (client, root) => writeIgnoredPaths(client, root, paths),
    },
    onSaved,
    onClose,
  });

  if (!open) return null;

  return (
    <ConfigModalShell
      titleId="ignored-paths-title"
      title="Ignored directories"
      description={DESCRIPTION}
      state={state}
      canSave={Boolean(root)}
      onClose={onClose}
      onSave={commit}
    >
      <label style={labelStyle}>Ignored directories</label>
      <PathList
        paths={paths}
        onChange={setPaths}
        labels={{ placeholder: "path/to/directory", add: "Add directory" }}
      />
    </ConfigModalShell>
  );
}

const DESCRIPTION = (
  <>
    Repo-relative directories excluded from the diagram and from analysis, in the
    app and in <code>codechart-cli</code>. Their files produce no modules, edges,
    or diagnostics. Paths are exact, so <code>Source/ThirdParty</code> does not
    affect <code>Other/ThirdParty</code>.
  </>
);
