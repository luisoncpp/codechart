// @Architecture(descriptionShort="One rendered code row: gutter, line number, and syntax tokens")
import type { DiffDisplayRow } from "../../../../domain/diff";
import type { Token } from "./highlighter";
import type { LineMatchRange } from "./match-highlight";
import { TokenText } from "./TokenText";
import type { WikiLinkSpan } from "../wiki_links";

export interface DiffCodeLineProps {
  row: DiffDisplayRow;
  tokens: Token[];
  zoom: number;
  prefix: string;
  active?: boolean;
  lineRef?: React.RefObject<HTMLDivElement | null>;
  clickableNames?: ReadonlySet<string>;
  path: string;
  links: readonly WikiLinkSpan[];
  linkEveryToken: boolean;
  anchored?: boolean;
  onLineClick?: (line: number, extend: boolean) => void;
  matchRanges?: readonly LineMatchRange[];
  activeMatchRef?: React.RefObject<HTMLElement | null>;
}

/** Token types whose text can never be a navigable identifier. */
const NON_CLICKABLE_TYPES = new Set(["string", "comment", "keyword", "number"]);

function tokenClass(token: Token, clickableNames?: ReadonlySet<string>): string {
  const clickable =
    clickableNames?.has(token.text) && !NON_CLICKABLE_TYPES.has(token.type);
  return `hl-${token.type}${clickable ? " hl-clickable" : ""}`;
}

export function DiffCodeLine(props: DiffCodeLineProps) {
  const { row, zoom, prefix, active, lineRef, anchored, onLineClick } = props;
  const fontSize = 12.5 / zoom;
  const gutter = row.kind === "add" ? "+" : row.kind === "remove" ? "-" : " ";
  const lineNumber = row.kind === "remove" ? "" : String(row.lineNumber);
  const numberStyle = {
    flex: `0 0 ${18 / zoom}px`,
    textAlign: "right" as const,
    paddingRight: 6 / zoom,
    color: "#94a3b8",
    fontSize: fontSize * 0.9,
  };

  return (
    <div
      ref={lineRef}
      className={`${prefix}__line ${prefix}__line--${row.kind}${active ? ` ${prefix}__line--active` : ""}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: `0 ${8 / zoom}px`,
        whiteSpace: "pre",
        fontSize,
        lineHeight: 1.4,
      }}
    >
      <span
        className={`${prefix}__gutter ${prefix}__gutter--${row.kind}`}
        style={{
          flex: `0 0 ${22 / zoom}px`,
          textAlign: "right",
          paddingRight: 6 / zoom,
          userSelect: "none",
          fontSize: fontSize * 0.9,
        }}
      >
        {gutter}
      </span>
      {row.kind === "remove" ? (
        <span className={`${prefix}__ln`} style={{ ...numberStyle, userSelect: "none" }}>
          {lineNumber}
        </span>
      ) : (
        <button
          type="button"
          className={`${prefix}__ln`}
          onClick={(event) => onLineClick?.(row.lineNumber, event.shiftKey)}
          style={{ ...numberStyle, border: 0, background: "transparent", cursor: "pointer" }}
        >
          {lineNumber}
        </button>
      )}
      <span
        className={`${prefix}__text${anchored ? ` ${prefix}__text--review-note` : ""}`}
        style={{ flex: 1, background: anchored ? "#f3e8ff" : undefined }}
      >
        <LineTokens {...props} />
      </span>
    </div>
  );
}

/** The row's tokens, each wrapping its own link/match sub-spans. */
function LineTokens({ tokens, clickableNames, path, links, linkEveryToken, matchRanges, activeMatchRef }: DiffCodeLineProps) {
  if (tokens.length === 0) return <> </>;
  let tokenStart = 0;
  return (
    <>
      {tokens.map((token, i) => {
        const start = tokenStart;
        tokenStart += token.text.length;
        const linkable = linkEveryToken || token.type === "comment";
        return (
          <span key={i} className={tokenClass(token, clickableNames)}>
            <TokenText
              text={token.text}
              tokenStart={start}
              path={path}
              links={linkable ? links : undefined}
              matchRanges={matchRanges}
              activeMatchRef={activeMatchRef}
            />
          </span>
        );
      })}
    </>
  );
}
