import { useReviewNotes } from "../../../state/review-notes";
import type { ReviewNotesStore } from "../../../state/review-notes";

export function ReviewNotesSidebar({ store }: { store: ReviewNotesStore }) {
  useReviewNotes(store);
  if (store.getPhase() === "loading") return <p>Loading Review Notes…</p>;
  if (store.getPhase() === "failed") return <div><p role="alert">Review Notes unavailable: {store.getError()}</p><button type="button" onClick={() => store.retryLoad()}>Retry</button></div>;
  const notes = store.filteredNotes();
  return <div>
    <p style={{ color: "#64748b", marginTop: 0 }}>{notes.length} active Review Notes</p>
    {notes.map((note) => <button key={note.id} type="button" onClick={() => store.navigate(note)} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 8, padding: 8, border: "1px solid #ddd", background: "#fff" }}><strong>{note.path}:{note.startLine}</strong><br />{note.body}</button>)}
    {store.canUndo() && <button type="button" onClick={() => store.undoDone()}>Undo Done</button>}
  </div>;
}
