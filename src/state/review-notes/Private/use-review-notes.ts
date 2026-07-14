import { useEffect, useState } from "react";
import { ReviewNotesStore } from "./review-notes-store";

export function useReviewNotes(store: ReviewNotesStore) {
  const [, setTick] = useState(0);
  useEffect(() => { const listener = () => setTick((tick) => tick + 1); store.onChange(listener); return () => store.offChange(listener); }, [store]);
  return store;
}
