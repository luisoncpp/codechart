// @Architecture(descriptionShort="Topic identifiers, labels, and metadata registry for the Help menu")
import { ARCHITECTURE_TAGS_MARKDOWN } from "./help-architecture-tags";
import { DIFF_NOTES_MARKDOWN } from "./help-diff-notes";
import { GROUPS_FORMAT_MARKDOWN } from "./help-groups-format";
import { WIKI_LINKS_MARKDOWN } from "./help-wiki-links";

export type HelpTopicId =
  | "groups-format"
  | "architecture-tags"
  | "diff-notes"
  | "wiki-links";

export interface HelpTopic {
  id: HelpTopicId;
  menuLabel: string;
  title: string;
  markdown: string;
}

export const HELP_TOPICS: Record<HelpTopicId, HelpTopic> = {
  "groups-format": {
    id: "groups-format",
    menuLabel: "Groups format...",
    title: "Help: Groups format",
    markdown: GROUPS_FORMAT_MARKDOWN,
  },
  "architecture-tags": {
    id: "architecture-tags",
    menuLabel: "Architecture tags...",
    title: "Help: Architecture tags",
    markdown: ARCHITECTURE_TAGS_MARKDOWN,
  },
  "diff-notes": {
    id: "diff-notes",
    menuLabel: "Diff notes...",
    title: "Help: Diff notes",
    markdown: DIFF_NOTES_MARKDOWN,
  },
  "wiki-links": {
    id: "wiki-links",
    menuLabel: "Wiki links...",
    title: "Help: Wiki links",
    markdown: WIKI_LINKS_MARKDOWN,
  },
};
