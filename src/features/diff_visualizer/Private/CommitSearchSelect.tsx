// @Architecture(descriptionShort="Searchable commit picker for the diff modal")
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOCAL_CHANGES_REF,
  type GitCommit,
} from "../../../ipc/git-client";
import {
  emptyStyle,
  fieldStyle,
  labelStyle,
  listStyle,
  menuStyle,
  optionSelectedStyle,
  optionStyle,
  searchStyle,
  triggerStyle,
  triggerTextStyle,
} from "./commit-search-select-styles";

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
  const selectedDate = selected?.date.slice(0, 10);
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
      <span style={labelStyle}>
        {label}{selectedDate ? ` (${selectedDate})` : ""}
      </span>
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
  if (commit.hash === LOCAL_CHANGES_REF) return commit.message;
  return `${commit.hash.slice(0, 7)} — ${commit.message}`;
}
