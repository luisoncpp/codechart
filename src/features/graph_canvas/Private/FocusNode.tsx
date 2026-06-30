// @Architecture(descriptionShort="Centers the canvas viewport on a module requested by the inspector")
import { useEffect } from "react";
import { useReactFlow, useStore, useStoreApi } from "@xyflow/react";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { moduleCenterFromLayout, viewportCanPan } from "./focus-viewport";

interface FocusNodeProps {
  store: GraphSessionStore;
}

const MAX_ATTEMPTS = 60;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Pans the viewport to the module from the latest `store.focusOn` request. */
export function FocusNode({ store }: FocusNodeProps) {
  const session = useGraphSession(store);
  const focus = session.getFocusRequest();
  const layout = session.getLayout();
  const panReady = useStore((s) => viewportCanPan(s));
  const { setCenter, getZoom } = useReactFlow();
  const storeApi = useStoreApi();

  useEffect(() => {
    const id = focus?.id;
    if (!id || !layout || !panReady) return;

    let cancelled = false;

    const run = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt++) {
        const center = moduleCenterFromLayout(layout, id);
        if (
          !center ||
          !Number.isFinite(center.x) ||
          !Number.isFinite(center.y) ||
          !viewportCanPan(storeApi.getState())
        ) {
          await nextFrame();
          continue;
        }
        const ok = await setCenter(center.x, center.y, {
          zoom: getZoom(),
          duration: /*durationMs=*/250,
        });
        if (ok) return;
        await nextFrame();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [focus?.seq, layout, panReady, setCenter, getZoom, storeApi]);

  return null;
}
