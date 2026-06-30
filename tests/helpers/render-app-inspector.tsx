import { render } from "@testing-library/react";
import { useState } from "react";
import {
  DEFAULT_INSPECTOR_WIDTH,
  InspectionPanel,
} from "../../src/features/inspection_panel";
import type { GraphSessionStore } from "../../src/state/graph-session";

export function renderAppInspector(
  store: GraphSessionStore,
  options?: { initialWidth?: number; initialOpen?: boolean },
) {
  function Shell() {
    const [open, setOpen] = useState(options?.initialOpen ?? /*defaultOpen=*/true);
    const [width, setWidth] = useState(
      options?.initialWidth ?? DEFAULT_INSPECTOR_WIDTH,
    );
    if (!open) {
      return (
        <button
          type="button"
          aria-label="Show inspector"
          title="Show inspector"
          onClick={() => setOpen(/*open=*/true)}
        >
          ◀
        </button>
      );
    }
    return (
      <InspectionPanel
        store={store}
        width={width}
        onWidthChange={setWidth}
        onHide={() => setOpen(/*open=*/false)}
      />
    );
  }
  return render(<Shell />);
}

export function inspectorAside(): HTMLElement {
  return document.querySelector("aside")!;
}
