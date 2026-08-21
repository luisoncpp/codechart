// @Architecture(descriptionShort="Renders the open preview frames")
import type { GraphDiffOverlay } from "../../../../domain/diff";
import { SymbolSourceWidget, type FrameHandlers } from "./SymbolSourceWidget";
import type { PreviewFrame } from "./frame-list";
import { diffNotesForPreview, fileDiffForPreview, isDiffPreviewFile } from "./preview-file-diff";

interface PreviewFramesViewProps {
  frames: readonly PreviewFrame[];
  clickableByModule: ReadonlyMap<string, ReadonlySet<string>>;
  diffOverlay: GraphDiffOverlay | null;
  diffReviewedIds?: ReadonlySet<string>;
  handlers: FrameHandlers;
}

export function PreviewFramesView({
  frames,
  clickableByModule,
  diffOverlay,
  diffReviewedIds,
  handlers,
}: PreviewFramesViewProps) {
  return (
    <>
      {frames.map((frame) => {
        const isDiff = isDiffPreviewFile(frame.modulePath, diffOverlay);
        const diffReview = isDiff
          ? {
              reviewed: diffReviewedIds?.has(frame.modulePath) ?? false,
              toggle: () => handlers.onToggleDiffReview?.(frame.modulePath),
            }
          : null;
        return (
          <SymbolSourceWidget
            key={frame.id}
            frame={frame}
            clickableSymbols={clickableByModule.get(frame.moduleId) ?? EMPTY_NAMES}
            fileDiff={fileDiffForPreview(frame.modulePath, diffOverlay)}
            diffNotes={diffNotesForPreview(frame.modulePath, diffOverlay)}
            diffReview={diffReview}
            handlers={handlers}
          />
        );
      })}
    </>
  );
}

const EMPTY_NAMES: ReadonlySet<string> = new Set();
