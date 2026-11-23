// @Architecture(descriptionShort="React context exposing ReviewStackStore to inline diff views")
import { createContext, useContext, type ReactNode } from "react";
import { ReviewStackStore, useReviewStack } from "../../../state/review-stack";

const ReviewStackContext = createContext<ReviewStackStore | null>(null);

export function ReviewStackProvider({
  store,
  children,
}: {
  store: ReviewStackStore;
  children: ReactNode;
}) {
  return <ReviewStackContext.Provider value={store}>{children}</ReviewStackContext.Provider>;
}

export function useReviewStackStore(): ReviewStackStore | null {
  const store = useContext(ReviewStackContext);
  if (!store) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useReviewStack(store);
}
