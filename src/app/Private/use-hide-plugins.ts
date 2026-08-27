// @Architecture(descriptionShort="Persists View-menu Hide plugins and reloads the project")
import { useEffect, useState } from "react";
import {
  writeHidePlugins,
  type ProjectConfigClient,
} from "../../ipc/project-config-client";

export function useHidePlugins(
  client: ProjectConfigClient,
  projectRoot: string | null,
  reload: () => void,
) {
  const [hidePlugins, setHidePlugins] = useState(/*unreal default=*/ true);

  useEffect(() => {
    if (!projectRoot) {
      setHidePlugins(/*unreal default=*/ true);
      return;
    }
    let active = true;
    setHidePlugins(/*unreal default=*/ true);
    client
      .readProjectConfig(projectRoot)
      .then((config) => active && setHidePlugins(config.unreal.hidePlugins))
      .catch(() => active && setHidePlugins(/*unreal default=*/ true));
    return () => {
      active = false;
    };
  }, [client, projectRoot]);

  const setHidden = async (hide: boolean) => {
    if (!projectRoot) return;
    await writeHidePlugins(client, projectRoot, /*hide=*/ hide);
    setHidePlugins(hide);
    reload();
  };

  return { hidePlugins, setHidden };
}
