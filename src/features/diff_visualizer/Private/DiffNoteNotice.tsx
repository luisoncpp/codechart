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
  const html = useMemo(
    () => diffNoteMarked.parse(note.body, { async: false }) as string,
    [note.body],
  );

  if (!expanded) {
    return (
      <article className="diff-note-inline__card diff-note-inline__card--collapsed">
        <button
          type="button"
          className="diff-note-inline__toggle"
          aria-expanded={false}
          onClick={() => setExpanded(/*expanded=*/true)}
        >
          <span className="diff-note-inline__chevron" aria-hidden>
            ›
          </span>
          <span>Diff note</span>
        </button>
      </article>
    );
  }

  return (
    <article className="diff-note-inline__card">
      <div className="diff-note-inline__body">
        <button
          type="button"
          className="diff-note-inline__collapse-btn"
          aria-expanded={true}
          aria-label="Collapse diff note"
          onClick={() => setExpanded(/*expanded=*/false)}
        >
          <span className="diff-note-inline__chevron" aria-hidden>
            ⌄
          </span>
        </button>
        <div
          className="diff-note-inline__content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
