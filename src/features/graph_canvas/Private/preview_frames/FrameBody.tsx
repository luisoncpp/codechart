// @Architecture(descriptionShort="Preview frame body: symbol source code or module document, with find-match threading")
import type { FileLineDiff } from "../../../../domain/diff";
import { DiffCodeLines } from "../highlight/DiffCodeLines";
import { L2CodeBlock, L2Description } from "../l2/L2Content";
import type { LineMatchRange } from "../highlight/match-highlight";
import type { PreviewFrame } from "./frame-list";

export interface FrameMatchProps {
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

export function SymbolCode(
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

export function DocumentContent({ frame, fileDiff, clickableSymbols, matchProps }: CodeContentProps) {
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
