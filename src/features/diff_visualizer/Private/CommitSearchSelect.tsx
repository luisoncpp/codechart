// @Architecture(descriptionShort="Searchable commit picker for the diff modal")
import { useEffect, useMemo, useRef, useState } from "react";
import type { GitCommit } from "../../../ipc/git-client";

interface CommitSearchSelectProps {
  label: string;
  value: string;
  commits: GitCommit[];
  onChange: (hash: string) => void;
  placeholder?: string;
}

export function CommitSearchSelect({
  label,
  value,
  commits,
  onChange,
  placeholder = "Search commits…",
}: CommitSearchSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = commits.find((c) => c.hash === value) ?? null;
  const filtered = useMemo(
    () => commits.filter((c) => matchesCommit(c, query)),
    [commits, query],
  );

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const pick = (hash: string) => {
    onChange(hash);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle}
      >
        <span style={triggerTextStyle}>
          {selected ? formatCommit(selected) : placeholder}
        </span>
        <span aria-hidden style={{ opacity: 0.45 }}>▾</span>
      </button>
      {open && (
        <div style={menuStyle}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            style={searchStyle}
            aria-label={`Search ${label}`}
          />
          <ul role="listbox" style={listStyle}>
            {filtered.length === 0 ? (
              <li style={emptyStyle}>No matching commits</li>
            ) : (
              filtered.map((c) => (
                <li key={c.hash} role="option" aria-selected={c.hash === value}>
                  <button
                    type="button"
                    onClick={() => pick(c.hash)}
                    style={{
                      ...optionStyle,
                      ...(c.hash === value ? optionSelectedStyle : {}),
                    }}
                  >
                    {formatCommit(c)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function matchesCommit(commit: GitCommit, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    commit.hash.toLowerCase().includes(q) ||
    commit.message.toLowerCase().includes(q)
  );
}

function formatCommit(commit: GitCommit): string {
  return `${commit.hash.slice(0, 7)} — ${commit.message}`;
}

const fieldStyle: React.CSSProperties = {
  position: "relative",
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b",
};

const triggerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  fontSize: 12,
  textAlign: "left",
  cursor: "pointer",
};

const triggerTextStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: "ui-monospace, monospace",
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  zIndex: 2,
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxShadow: "0 10px 30px #0f172a22",
  overflow: "hidden",
};

const searchStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "none",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 12,
  outline: "none",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 4,
  maxHeight: 220,
  overflowY: "auto",
};

const optionStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "none",
  borderRadius: 4,
  background: "transparent",
  fontSize: 12,
  fontFamily: "ui-monospace, monospace",
  textAlign: "left",
  cursor: "pointer",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const optionSelectedStyle: React.CSSProperties = {
  background: "#eef2ff",
  color: "#3730a3",
};

const emptyStyle: React.CSSProperties = {
  padding: "10px 8px",
  fontSize: 12,
  color: "#94a3b8",
};
