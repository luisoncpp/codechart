// @Architecture(descriptionShort="Small controls for the Unreal config modal")
import type { UnrealConfig } from "../../../ipc/project-config-client";

interface PathListProps {
  paths: string[];
  onChange: (paths: string[]) => void;
}

export function PathList({ paths, onChange }: PathListProps) {
  const update = (index: number, value: string) => {
    onChange(paths.map((path, i) => (i === index ? value : path)));
  };
  const remove = (index: number) => {
    onChange(paths.filter((_, i) => i !== index));
  };
  return (
    <div style={listStyle}>
      {paths.map((path, index) => (
        <div key={index} style={rowStyle}>
          <input
            value={path}
            onChange={(e) => update(index, e.target.value)}
            placeholder="Source/Game/Public"
            style={inputStyle}
          />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...paths, ""])}>
        Add path
      </button>
    </div>
  );
}

interface ToggleListProps {
  unreal: UnrealConfig;
  onChange: (unreal: UnrealConfig) => void;
}

export function ToggleList({ unreal, onChange }: ToggleListProps) {
  return (
    <div style={toggleStackStyle}>
      <label style={toggleStyle}>
        <input
          type="checkbox"
          checked={unreal.hideGeneratedFiles}
          onChange={(e) =>
            onChange({ ...unreal, hideGeneratedFiles: e.target.checked })
          }
        />
        Hide generated Unreal files
      </label>
      <label style={toggleStyle}>
        <input
          type="checkbox"
          checked={unreal.excludeEngineReferences}
          onChange={(e) =>
            onChange({ ...unreal, excludeEngineReferences: e.target.checked })
          }
        />
        Exclude Unreal Engine references
      </label>
    </div>
  );
}

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
};

const toggleStackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const toggleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
};
