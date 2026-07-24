// @Architecture(descriptionShort="Toolbar entry for project-local editor and C++ settings")
import { useState } from "react";
import type { ProjectConfigClient } from "../../../ipc/project-config-client";
import { UnrealConfigModal } from "../../project_config";
import {
  DropdownMenu,
  MenuActionItem,
  MenuSeparator,
} from "../../../ui/dropdown_menu";
import { EditorConfigModal } from "./EditorConfigModal";

interface SettingsMenuProps {
  root: string;
  editor: string;
  hasCppModules: boolean;
  client: ProjectConfigClient;
  onEditorSaved: (editor: string) => void;
  onCppConfigSaved: () => void;
}

export function SettingsMenu({
  root,
  editor,
  hasCppModules,
  client,
  onEditorSaved,
  onCppConfigSaved,
}: SettingsMenuProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [cppOpen, setCppOpen] = useState(false);

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
    </>
  );
}
