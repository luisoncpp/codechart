import { useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { ReviewNote } from "../../../ipc/review-notes-client";
import { useReviewNotesStore } from "./review-notes-context";
import "./inline-review-notes.css";

interface InlineReviewNotesProps {
  notes: readonly ReviewNote[];
  showDraft: boolean;
  zoom?: number;
}

export function InlineReviewNotes({ notes, showDraft, zoom = 1 }: InlineReviewNotesProps) {
  const store = useReviewNotesStore();
  const draft = store?.getDraft();
  if (!store || (notes.length === 0 && !showDraft)) return null;

  const style = { "--review-note-scale": String(1 / zoom) } as CSSProperties;
  return (
    <section className="review-note-inline" style={style} aria-label="Review Notes">
      {notes.map((note) => <ReviewNoteCard key={note.id} note={note} />)}
      {showDraft && draft && <DraftCard key={draftKey(draft)} />}
    </section>
  );
}

function ReviewNoteCard({ note }: { note: ReviewNote }) {
  const store = useReviewNotesStore();
  const [expanded, setExpanded] = useState(/*defaultExpanded=*/true);
  const label = noteLabel(note);
  const bodyId = `review-note-${note.id}`;

  if (!store) return null;
  return (
    <article className="review-note-inline__card">
      <button
        type="button"
        className="review-note-inline__toggle"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="review-note-inline__chevron" aria-hidden>{expanded ? "⌄" : "›"}</span>
        <span>{label}</span>
      </button>
      {expanded && (
        <div id={bodyId} className="review-note-inline__body">
          <textarea
            aria-label={`Review Note ${note.body}`}
            defaultValue={note.body}
            onBlur={(event) => store.editBody(note.id, event.target.value)}
          />
          <div className="review-note-inline__actions">
            <button type="button" onClick={() => store.done(note.id)}>Done</button>
          </div>
        </div>
      )}
    </article>
  );
}

function DraftCard() {
  const store = useReviewNotesStore();
  const [body, setBody] = useState("");

  if (!store) return null;
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") store.cancelDraft();
  };

  return (
    <article className="review-note-inline__card review-note-inline__card--draft">
      <div className="review-note-inline__draft-title">
        <span>New Review Note</span>
        <button
          type="button"
          className="review-note-inline__close"
          aria-label="Close New Review Note"
          onClick={() => store.cancelDraft()}
        >
          ✕
        </button>
      </div>
      <div className="review-note-inline__body">
        <textarea
          aria-label="New Review Note"
          autoFocus
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {store.getValidation() && <div className="review-note-inline__validation" role="alert">{store.getValidation()}</div>}
        <div className="review-note-inline__actions">
          <button type="button" onClick={() => store.confirmDraft(body)}>Add Review Note</button>
        </div>
      </div>
    </article>
  );
}

function noteLabel(note: ReviewNote): string {
  return note.startLine === note.endLine
    ? `Review Note on line ${note.startLine}`
    : `Review Note on lines ${note.startLine}–${note.endLine}`;
}

function draftKey(draft: { path: string; startLine: number; endLine: number }) {
  return `${draft.path}:${draft.startLine}:${draft.endLine}`;
}
