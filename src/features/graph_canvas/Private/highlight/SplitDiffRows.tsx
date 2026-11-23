// @Architecture(descriptionShort="Split diff view: before | after columns, one grid row per pair so wrapped sides stay aligned")
import { useMemo } from "react";
import { pairSplitRows, type DiffDisplayRow, type SplitCell } from "../../../../domain/diff";
import type { Token } from "./highlighter-types";
import { DiffRowItem, type DiffRowItemProps } from "./DiffRowItem";
import type { WikiLinkSpan } from "../wiki_links";

/** Row props identical for every row of the document. */
export type SharedRowProps = Omit<DiffRowItemProps, "row" | "tokens" | "links" | "beforeSide">;

export interface SplitDiffRowsProps {
  /** Unified rows; `tokens` / `links` are indexed like them. */
  rows: readonly DiffDisplayRow[];
  tokens: readonly Token[][];
  links: readonly WikiLinkSpan[][];
  shared: SharedRowProps;
}

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
};

/** Left column is the before-file (read-only), right column the after-file. */
export function SplitDiffRows({ rows, tokens, links, shared }: SplitDiffRowsProps) {
  const pairs = useMemo(/*pairBeforeAndAfter*/ () => pairSplitRows(rows), [rows]);
  const { prefix } = shared.chrome;
  const cell = (side: SplitCell | undefined, beforeSide: boolean) => {
    const sideClass = `${prefix}__split-cell ${prefix}__split-cell--${beforeSide ? "before" : "after"}`;
    if (!side) return <div className={`${sideClass} ${prefix}__split-filler`} />;
    return (
      <div className={sideClass} style={{ minWidth: 0 }}>
        <DiffRowItem
          row={side.row} tokens={tokens[side.index]!} links={links[side.index]!}
          beforeSide={beforeSide} {...shared}
        />
      </div>
    );
  };
  return (
    <>
      {pairs.map((pair, i) => (
        <div key={i} className={`${prefix}__split-row`} style={GRID_STYLE}>
          {cell(pair.left, /*beforeSide=*/ true)}
          {cell(pair.right, /*beforeSide=*/ false)}
        </div>
      ))}
    </>
  );
}
