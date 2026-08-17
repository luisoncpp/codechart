// @Architecture(descriptionShort="Preview frame body: symbol source, module document, or rendered markdown")
import type { FileLineDiff } from "../../../../domain/diff";
import { DiffCodeLines } from "../highlight/DiffCodeLines";
import { L2CodeBlock, L2Description } from "../l2/L2Content";
import { MarkdownBody, markdownBodyStyles } from "../l2/MarkdownBody";
import type { LineMatchRange } from "../highlight/match-highlight";
import type { PreviewFrame } from "./frame-list";

interface FrameMatchProps {
  matchesByLine?: ReadonlyMap<number, readonly LineMatchRange[]>;
  descriptionRanges?: readonly LineMatchRange[];
  activeMatchRef?: React.RefObject<HTMLElement | null>;
}

interface CodeContentProps {
  frame: PreviewFrame;
  fileDiff?: FileLineDiff;
  clickableSymbols: ReadonlySet<string>;
  matchProps: FrameMatchProps;
}

interface FrameContentProps extends CodeContentProps {
  /** Markdown destination shown rendered; false shows its raw source instead. */
  renderMarkdown: boolean;
  targetLine?: number;
  lineRef: React.RefObject<HTMLDivElement | null>;
}

/** Which body a frame shows: an unreadable file, markdown, a symbol, or a document. */
export function FrameContent(props: FrameContentProps) {
  const { frame } = props;
  if (frame.loadError) {
    return <p className="symbol-widget__error" role="alert">{frame.loadError}</p>;
  }
  if (props.renderMarkdown) return <MarkdownDocument frame={frame} />;
  if (frame.symbolName) {
    return <SymbolCode {...props} targetLine={props.targetLine ?? 1} />;
  }
  return <DocumentContent {...props} />;
}

function SymbolCode(
  props: CodeContentProps & {
    targetLine: number;
    lineRef: React.RefObject<HTMLDivElement | null>;
  },
) {
  return (
    <pre className="symbol-widget__code">
      <DiffCodeLines
        source={props.frame.sourceText}
        path={props.frame.modulePath}
        fileDiff={props.fileDiff}
        lineClassPrefix="symbol-widget"
        activeLine={props.targetLine}
        activeLineRef={props.lineRef}
        clickableNames={props.clickableSymbols}
        matchesByLine={props.matchProps.matchesByLine}
        activeMatchRef={props.matchProps.activeMatchRef}
      />
    </pre>
  );
}

function DocumentContent({ frame, fileDiff, clickableSymbols, matchProps }: CodeContentProps) {
  return (
    <div className="symbol-widget__document">
      <L2Description
        description={frame.description}
        color={frame.color}
        zoom={1}
        matchRanges={matchProps.descriptionRanges}
        activeMatchRef={matchProps.activeMatchRef}
      />
      <L2CodeBlock
        snippet={frame.sourceText}
        path={frame.modulePath}
        zoom={1}
        fileDiff={fileDiff}
        clickableNames={clickableSymbols}
        lineClassPrefix="symbol-widget"
        matchesByLine={matchProps.matchesByLine}
        activeMatchRef={matchProps.activeMatchRef}
      />
    </div>
  );
}

/** A markdown destination (usually a project doc) rendered as prose. */
function MarkdownDocument({ frame }: { frame: PreviewFrame }) {
  return (
    <div className="symbol-widget__markdown">
      <style>{markdownBodyStyles(frame.color, /*zoom=*/ 1)}</style>
      <MarkdownBody source={frame.sourceText} zoom={1} sourcePath={frame.modulePath} />
    </div>
  );
}
