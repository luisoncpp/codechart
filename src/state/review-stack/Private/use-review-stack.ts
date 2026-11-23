// @Architecture(descriptionShort="React hook subscribing components to ReviewStackStore updates")
import { useSyncExternalStore } from "react";
import type { ReviewStackStore } from "./review-stack-store";

export function useReviewStack(store: ReviewStackStore): ReviewStackStore {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  return store;
}
