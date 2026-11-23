// @Architecture(descriptionShort="Toolbar Help dropdown menu for architectural concepts and syntax documentation")
import { useState } from "react";
import { DropdownMenu, MenuActionItem } from "../../../ui/dropdown_menu";
import { HELP_TOPICS, type HelpTopic } from "./help-docs";
import { withExecutablePath } from "./help-mcp-server";
import { HelpModal } from "./HelpModal";

interface HelpMenuProps {
  /** Path of the running executable, printed into the MCP server registration snippets. */
  getExecutablePath: () => Promise<string | null>;
}

export function HelpMenu({ getExecutablePath }: HelpMenuProps) {
  const [activeTopic, setActiveTopic] = useState<HelpTopic | null>(null);

  const openMcpTopic = async () => {
    const topic = HELP_TOPICS["mcp-server"];
    const executablePath = await getExecutablePath().catch(/*pathUnknown*/ () => null);
    setActiveTopic({ ...topic, markdown: withExecutablePath(topic.markdown, executablePath) });
  };

  return (
    <>
      <DropdownMenu label="Help">
        <MenuActionItem
          label="Groups format..."
          onSelect={() => setActiveTopic(HELP_TOPICS["groups-format"])}
        />
        <MenuActionItem
          label="Architecture tags..."
          onSelect={() => setActiveTopic(HELP_TOPICS["architecture-tags"])}
        />
        <MenuActionItem
          label="Diff notes..."
          onSelect={() => setActiveTopic(HELP_TOPICS["diff-notes"])}
        />
        <MenuActionItem
          label="Wiki links..."
          onSelect={() => setActiveTopic(HELP_TOPICS["wiki-links"])}
        />
        <MenuActionItem
          label="MCP server..."
          onSelect={() => void openMcpTopic()}
        />
        <MenuActionItem
          label="Code review skill / prompt..."
          onSelect={() => setActiveTopic(HELP_TOPICS["code-review-prompt"])}
        />
      </DropdownMenu>
      <HelpModal
        topic={activeTopic}
        onClose={() => setActiveTopic(/*topic=*/ null)}
      />
    </>
  );
}
