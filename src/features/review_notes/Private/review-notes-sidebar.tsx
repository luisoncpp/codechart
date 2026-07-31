import { useState } from "react";
import { useReviewNotes } from "../../../state/review-notes";
import type { ReviewNotesStore } from "../../../state/review-notes";
import type { ReviewNote } from "../../../ipc/review-notes-client";
import "./review-notes-sidebar.css";

export function ReviewNotesSidebar({ store }: { store: ReviewNotesStore }) {
  useReviewNotes(store);
  if (store.getPhase() === "loading") return <p>Loading Review Notes…</p>;
  if (store.getPhase() === "failed") return <div><p role="alert">Review Notes unavailable: {store.getError()}</p><button type="button" onClick={() => store.retryLoad()}>Retry</button></div>;
  const notes = store.filteredNotes();
  return (
    <section className="review-notes-sidebar" aria-label="Active Review Notes">
      <header className="review-notes-sidebar__summary">
        <p>{activeLabel(notes.length)}</p>
        <div className="review-notes-sidebar__actions">
          <CopyAllReviewNotesButton notes={store.getDocument().notes} />
          <button
            type="button"
            className="review-notes-sidebar__resolve-all"
            disabled={notes.length === 0}
            onClick={() => store.doneAll(notes.map((note) => note.id))}
          >
            Resolve all
          </button>
        </div>
      </header>
      <div className="review-notes-sidebar__list">
        {notes.map((note) => <ReviewNoteRow key={note.id} note={note} store={store} />)}
      </div>
      {notes.length === 0 && <p className="review-notes-sidebar__empty">No active Review Notes in this view.</p>}
      {store.canUndo() && <button className="review-notes-sidebar__undo" type="button" onClick={() => store.undoDone()}>Undo resolve</button>}
    </section>
  );
}

function CopyAllReviewNotesButton({ notes }: { notes: readonly ReviewNote[] }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const label = copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy all comments";

  async function copyAll() {
    if (notes.length === 0) return;
    try {
      await navigator.clipboard.writeText(reviewNotesClipboardText(notes));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <button
      type="button"
      className={`review-notes-sidebar__copy-all review-notes-sidebar__copy-all--${copyStatus}`}
      disabled={notes.length === 0}
      aria-live="polite"
      onClick={/*copyAllReviewNotes*/ () => void copyAll()}
    >
      {label}
    </button>
  );
}

function ReviewNoteRow({ note, store }: { note: ReviewNote; store: ReviewNotesStore }) {
  const location = `${note.path}:${note.startLine}`;
  return (
    <article className="review-notes-sidebar__note">
      <button type="button" className="review-notes-sidebar__open" onClick={() => store.navigate(note)}>
        <strong>{location}</strong>
        <span>{note.body}</span>
      </button>
      <button
        type="button"
        className="review-notes-sidebar__resolve"
        aria-label={`Resolve Review Note at ${location}`}
        onClick={() => store.done(note.id)}
      >
        <span aria-hidden>✓</span> Resolve
      </button>
    </article>
  );
}

function activeLabel(count: number) {
  return `${count} active Review Note${count === 1 ? "" : "s"}`;
}

function reviewNotesClipboardText(notes: readonly ReviewNote[]) {
  return notes.map((note) => {
    const lineRange = note.endLine === note.startLine
      ? `${note.startLine}`
      : `${note.startLine}-${note.endLine}`;
    return `${note.path}:${lineRange}\n${note.body}`;
  }).join("\n\n");
}
