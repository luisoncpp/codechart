// @Architecture(descriptionShort="Load/save lifecycle shared by the project config modals")
// One responsibility: read `.codechart/config.json` when a modal opens, write it
// back on save, and expose the loading/saving/error state the dialog chrome needs.
// Both modals differ only in how they project the config into their fields, which
// is what `load` and `save` are for.

import { useCallback, useEffect, useState } from "react";
import type { ProjectConfig, ProjectConfigClient } from "../../../ipc/project-config-client";

interface ConfigModalIo {
  /** Called with the freshly read config whenever the modal opens. */
  load: (config: ProjectConfig) => void;
  /** Persists the edited value; receives the same client and root. */
  save: (client: ProjectConfigClient, root: string) => Promise<unknown>;
}

interface ConfigModalArgs {
  open: boolean;
  root: string | null;
  client: ProjectConfigClient;
  io: ConfigModalIo;
  onSaved: () => void;
  onClose: () => void;
}

export function useConfigModalState({
  open,
  root,
  client,
  io,
  onSaved,
  onClose,
}: ConfigModalArgs) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { load, save } = io;

  useEffect(/*readConfigOnOpen*/ () => {
    if (!open || !root) return;
    setLoading(true);
    setError(null);
    client
      .readProjectConfig(root)
      .then(load)
      .catch((e) => setError(message(e)))
      .finally(() => setLoading(false));
    // `load` is redefined every render by callers; opening is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, open, root]);

  const commit = useCallback(
    /*writeConfigAndReload*/ async () => {
      if (!root) return;
      setSaving(true);
      setError(null);
      try {
        await save(client, root);
        onSaved();
        onClose();
      } catch (e) {
        setError(message(e));
      } finally {
        setSaving(false);
      }
    },
    [client, root, save, onSaved, onClose],
  );

  return { state: { loading, saving, error }, commit };
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
