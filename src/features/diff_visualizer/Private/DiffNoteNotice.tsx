// @Architecture(descriptionShort="Read-only Diff Note notice card rendered in source views")
import { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import { Marked, type Tokens } from "marked";
import type { DiffNote } from "../../../domain/diff";
import "./diff-note-notice.css";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const diffNoteMarked = new Marked({ async: false })
  .use({
    renderer: {
      html({ raw }: { raw: string }) {
        return escapeHtml(raw);
      },
      heading({ tokens }: Tokens.Heading) {
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
      hr() {
        return "";
      },
      checkbox() {
        return "";
      },
    },
  });

interface DiffNotesListProps {
  notes: readonly DiffNote[];
  zoom?: number;
}

export function DiffNotesList({ notes, zoom = 1 }: DiffNotesListProps) {
  if (notes.length === 0) return null;
  const style = { "--diff-note-scale": String(1 / zoom) } as CSSProperties;
  return (
    <section className="diff-note-inline" style={style} aria-label="Diff Notes">
      {notes.map((note, idx) => (
        <DiffNoteCard
          key={`${note.side}:${note.startLine}:${note.endLine}:${idx}`}
          note={note}
        />
      ))}
    </section>
  );
}

function DiffNoteCard({ note }: { note: DiffNote }) {
  const [expanded, setExpanded] = useState(/*defaultExpanded=*/true);
  const html = useMemo(() => {
    return diffNoteMarked.parse(note.body, { async: false }) as string;
  }, [note.body]);

  return (
    <article className="diff-note-inline__card">
      <button
        type="button"
        className="diff-note-inline__toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="diff-note-inline__chevron" aria-hidden>
          {expanded ? "⌄" : "›"}
        </span>
        <span>Diff Note</span>
      </button>
      {expanded && (
        <div
          className="diff-note-inline__body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </article>
  );
}
