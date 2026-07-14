import { createContext, useContext } from "react";
import type { ReviewNotesStore } from "../../../state/review-notes";

const ReviewNotesContext = createContext<ReviewNotesStore | null>(null);

export function ReviewNotesProvider({ store, children }: { store: ReviewNotesStore; children: React.ReactNode }) {
  return <ReviewNotesContext.Provider value={store}>{children}</ReviewNotesContext.Provider>;
}

export function useReviewNotesStore(): ReviewNotesStore | null { return useContext(ReviewNotesContext); }
