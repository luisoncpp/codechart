// @Architecture(descriptionShort="Opens a preview frame for a clicked `[[wiki-link]]`, module or not")
import type { RefObject } from "react";
import type { ModuleNode } from "../../../../domain/graph";
import type { GraphSessionStore } from "../../../../state/graph-session";
import { wikiLinkFromEvent, type WikiLinkClick } from "../wiki_links/wiki-link-dom";
import { wikiLinkCandidates } from "../wiki_links/wiki-link-candidates";
import { baseNameOf, isMarkdownPath } from "../wiki_links/wiki-link-target";
import { computePointWidgetPosition, type ClientPoint, type Position } from "./frame-placement";
import { placeNextToFrame } from "./live-frame-placement";
import type { NewPreviewFrame, OpenPreviewFrame } from "./frame-list";

/** Place the new frame next to the frame the link was clicked in, or at a point. */
type WikiPreviewAnchor = { frameId: number } | { point: ClientPoint };

interface WikiPreviewRequest {
  link: WikiLinkClick;
  anchor: WikiPreviewAnchor;
}

interface WikiPreviewDeps {
  containerRef: RefObject<HTMLDivElement | null>;
  store: GraphSessionStore;
  open: OpenPreviewFrame;
  /** Called before the awaited read so the opening click cannot close the new frame. */
  armGrace: () => void;
}

const FILE_COLOR = "#64748b";

/** A click anywhere a link can render — a frame body or a canvas node. */
interface LinkClickEvent {
  target: EventTarget | null;
  clientX: number;
  clientY: number;
}

export function createWikiLinkPreview(deps: WikiPreviewDeps) {
  const { containerRef, store, open, armGrace } = deps;

  const openLink = async (request: WikiPreviewRequest) => {
    const container = containerRef.current;
    const modulePaths = store.getGraph()?.modules.map((module) => module.path) ?? [];
    const candidates = wikiLinkCandidates(request.link, modulePaths);
    if (!container || candidates.length === 0) return;
    armGrace();
    const found = await firstReadable(store, candidates);
    open("keep-all", {
      ...frameContent(store, found ?? { path: candidates[0]!, source: null }),
      ...anchorPosition(request.anchor, container),
    });
  };

  return {
    openLink,
    /** True when the click was a link and has been handled. */
    openFromEvent(event: LinkClickEvent): boolean {
      const link = wikiLinkFromEvent(event.target);
      if (!link) return false;
      void openLink({ link, anchor: { point: { x: event.clientX, y: event.clientY } } });
      return true;
    },
  };
}

interface ReadFile {
  path: string;
  source: string | null;
}

/** First candidate the project can actually read; null when none can. */
async function firstReadable(
  store: GraphSessionStore,
  candidates: readonly string[],
): Promise<ReadFile | null> {
  for (const path of candidates) {
    const source = await store.fetchFileSource(path);
    if (source !== null) return { path, source };
  }
  return null;
}

/** A module destination keeps its label and description; any other file is bare. */
function frameIdentity(module: ModuleNode | undefined, path: string) {
  if (!module) {
    return { moduleId: path, moduleLabel: baseNameOf(path), description: undefined };
  }
  const annotation = module.annotation;
  return {
    moduleId: module.id,
    moduleLabel: module.label,
    description: annotation?.descriptionLong || annotation?.descriptionShort,
  };
}

function frameContent(
  store: GraphSessionStore,
  file: ReadFile,
): Omit<NewPreviewFrame, "top" | "left"> {
  const module = store.getGraph()?.modules.find((item) => item.path === file.path);
  const unreadable = file.source === null;
  return {
    ...frameIdentity(module, file.path),
    symbolName: null,
    modulePath: file.path,
    color: FILE_COLOR,
    sourceText: file.source ?? "",
    isMarkdown: !unreadable && isMarkdownPath(file.path),
    loadError: unreadable ? `Could not read ${file.path}` : undefined,
  };
}

function anchorPosition(anchor: WikiPreviewAnchor, container: HTMLElement): Position {
  const bounds = container.getBoundingClientRect();
  if ("point" in anchor) return computePointWidgetPosition(anchor.point, bounds);
  return (
    placeNextToFrame(anchor.frameId, container) ??
    computePointWidgetPosition({ x: bounds.left + 24, y: bounds.top + 24 }, bounds)
  );
}
