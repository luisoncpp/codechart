// @Architecture(descriptionShort="Modal for editing Unreal include path config")
import { useEffect, useState } from "react";
import {
  defaultProjectConfig,
  type ProjectConfig,
  type ProjectConfigClient,
} from "../../../ipc/project-config-client";
import { PathList, ToggleList } from "./UnrealConfigModalParts";

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !root) return;
    setLoading(true);
    setError(null);
    client
      .readProjectConfig(root)
      .then(setConfig)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [client, open, root]);

  if (!open) return null;

  const save = async () => {
    if (!root) return;
    setSaving(true);
    setError(null);
    try {
      await client.writeProjectConfig(root, cleanConfig(config));
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <section
        role="dialog"
        aria-labelledby="unreal-config-title"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="unreal-config-title" style={titleStyle}>
          Unreal paths
        </h2>
        <p style={copyStyle}>
          Known paths are searched like Unreal include roots. Engine headers stay
          external so they do not flood the graph.
        </p>
        {loading ? (
          <div style={copyStyle}>Loading config...</div>
        ) : (
          <>
            <label style={labelStyle}>Known include paths</label>
            <PathList
              paths={config.unreal.knownPaths}
              onChange={(knownPaths) =>
                setConfig({ ...config, unreal: { ...config.unreal, knownPaths } })
              }
            />
            <ToggleList
              unreal={config.unreal}
              onChange={(unreal) => setConfig({ ...config, unreal })}
            />
          </>
        )}
        {error && <div style={errorStyle}>{error}</div>}
        <div style={actionsStyle}>
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={loading || saving || !root}>
            {saving ? "Saving..." : "Save and reload"}
          </button>
        </div>
      </section>
    </div>
  );
}

function cleanConfig(config: ProjectConfig): ProjectConfig {
  return {
    unreal: {
      ...config.unreal,
      knownPaths: config.unreal.knownPaths.map((p) => p.trim()).filter(Boolean),
    },
  };
}

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "#0f172a66",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const panelStyle: React.CSSProperties = {
  width: "min(640px, 92vw)",
  background: "#ffffff",
  borderRadius: 10,
  boxShadow: "0 12px 40px #0f172a33",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "#0f172a",
};

const copyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#475569",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

const errorStyle: React.CSSProperties = {
  padding: 8,
  borderRadius: 6,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: 12,
};
