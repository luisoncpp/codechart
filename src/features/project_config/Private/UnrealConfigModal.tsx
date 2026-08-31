// @Architecture(descriptionShort="Modal for editing C++ include path config")
import { useState } from "react";
import {
  defaultProjectConfig,
  type ProjectConfig,
  type ProjectConfigClient,
} from "../../../ipc/project-config-client";
import { labelStyle } from "./config-modal-styles";
import { ConfigModalShell } from "./ConfigModalShell";
import { PathList, ToggleList } from "./UnrealConfigModalParts";
import { useConfigModalState } from "./use-config-modal-state";

interface UnrealConfigModalProps {
  open: boolean;
  root: string | null;
  client: ProjectConfigClient;
  onClose: () => void;
  onSaved: () => void;
}

export function UnrealConfigModal({
  open,
  root,
  client,
  onClose,
  onSaved,
}: UnrealConfigModalProps) {
  const [config, setConfig] = useState<ProjectConfig>(defaultProjectConfig);
  const { state, commit } = useConfigModalState({
    open,
    root,
    client,
    io: {
      load: setConfig,
      save: (client, root) => client.writeProjectConfig(root, cleanConfig(config)),
    },
    onSaved,
    onClose,
  });

  if (!open) return null;

  return (
    <ConfigModalShell
      titleId="project-config-title"
      title="C++ include paths"
      description="Known paths are searched when resolving C++ includes. The toggles below are Unreal-specific."
      state={state}
      canSave={Boolean(root)}
      onClose={onClose}
      onSave={commit}
    >
      <label style={labelStyle}>Known include paths</label>
      <PathList
        paths={config.unreal.knownPaths}
        onChange={(knownPaths) =>
          setConfig({ ...config, unreal: { ...config.unreal, knownPaths } })
        }
        labels={{ placeholder: "path/to/include", add: "Add include path" }}
      />
      <ToggleList
        unreal={config.unreal}
        onChange={(unreal) => setConfig({ ...config, unreal })}
      />
    </ConfigModalShell>
  );
}

function cleanConfig(config: ProjectConfig): ProjectConfig {
  return {
    ...config,
    unreal: {
      ...config.unreal,
      knownPaths: config.unreal.knownPaths.map((p) => p.trim()).filter(Boolean),
    },
  };
}
