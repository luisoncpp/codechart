// @Architecture(descriptionShort="Toolbar entry for project-local editor, C++ settings, and review-info clearing")
import { useState } from "react";
import type { ProjectConfigClient } from "../../../ipc/project-config-client";
import { UnrealConfigModal } from "../../project_config";
import {
  DropdownMenu,
  MenuActionItem,
  MenuSeparator,
} from "../../../ui/dropdown_menu";
import { ClearReviewInfoModal } from "./ClearReviewInfoModal";
import { EditorConfigModal } from "./EditorConfigModal";

interface SettingsMenuProps {
  root: string;
  editor: string;
  hasCppModules: boolean;
  client: ProjectConfigClient;
  onEditorSaved: (editor: string) => void;
  onCppConfigSaved: () => void;
  onClearReviewInfo: () => Promise<void>;
}

export function SettingsMenu({
  root,
  editor,
  hasCppModules,
  client,
  onEditorSaved,
  onCppConfigSaved,
  onClearReviewInfo,
}: SettingsMenuProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [cppOpen, setCppOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  return (
    <>
      <DropdownMenu label="Settings">
        <MenuActionItem label="Editor..." onSelect={() => setEditorOpen(true)} />
        {hasCppModules && (
          <>
            <MenuSeparator />
            <MenuActionItem
              label="C++ include paths..."
              onSelect={() => setCppOpen(true)}
            />
          </>
        )}
        <MenuSeparator />
        <MenuActionItem
          label="Clear review info..."
          onSelect={() => setClearOpen(true)}
        />
      </DropdownMenu>
      <EditorConfigModal
        open={editorOpen}
        root={root}
        editor={editor}
        client={client}
        onClose={() => setEditorOpen(false)}
        onSaved={onEditorSaved}
      />
      <UnrealConfigModal
        open={cppOpen}
        root={root}
        client={client}
        onClose={() => setCppOpen(false)}
        onSaved={onCppConfigSaved}
      />
      <ClearReviewInfoModal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={onClearReviewInfo}
      />
    </>
  );
}
