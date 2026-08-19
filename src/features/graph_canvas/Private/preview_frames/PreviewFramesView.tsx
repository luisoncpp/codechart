// @Architecture(descriptionShort="Renders the open preview frames")
import type { GraphDiffOverlay } from "../../../../domain/diff";
import { SymbolSourceWidget, type FrameHandlers } from "./SymbolSourceWidget";
import type { PreviewFrame } from "./frame-list";
import { fileDiffForPreview } from "./preview-file-diff";

interface PreviewFramesViewProps {
  frames: readonly PreviewFrame[];
  clickableByModule: ReadonlyMap<string, ReadonlySet<string>>;
  diffOverlay: GraphDiffOverlay | null;
  handlers: FrameHandlers;
}

export function PreviewFramesView({
  frames,
  clickableByModule,
  diffOverlay,
  handlers,
}: PreviewFramesViewProps) {
  return (
    <>
      {frames.map((frame) => (
        <SymbolSourceWidget
          key={frame.id}
          frame={frame}
          clickableSymbols={clickableByModule.get(frame.moduleId) ?? EMPTY_NAMES}
          fileDiff={fileDiffForPreview(frame.modulePath, diffOverlay)}
          handlers={handlers}
        />
      ))}
    </>
  );
}

const EMPTY_NAMES: ReadonlySet<string> = new Set();
