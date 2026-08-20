// @Architecture(descriptionShort="Global shortcut listener for Ctrl+Shift+I / F12 to toggle developer tools")
import { useEffect } from "react";
import type { DevtoolsClient } from "../../ipc/devtools-client";

export function useDevtoolsShortcut(client: DevtoolsClient) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isInspectorKey =
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "i") ||
        event.key === "F12";
      if (!isInspectorKey) return;
      event.preventDefault();
      void client.toggleDevtools();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [client]);
}
