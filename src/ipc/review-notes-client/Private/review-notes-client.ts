export interface ReviewNote {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  anchorLines: string[];
  body: string;
}

export interface ReviewNotesDocument {
  version: 1;
  notes: ReviewNote[];
}

export type ReviewNoteFilter =
  | { kind: "all" }
  | { kind: "module"; moduleId: string }
  | { kind: "group"; groupId: string };

export interface ReviewNoteNavigationRequest {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  seq: number;
}

export interface ReviewNotesClient {
  loadReviewNotes(root: string, modulePaths: string[]): Promise<ReviewNotesDocument>;
  saveReviewNotes(root: string, document: ReviewNotesDocument): Promise<void>;
}
