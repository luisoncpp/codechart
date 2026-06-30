import { render } from "@testing-library/react";
import { useState } from "react";
import {
  DEFAULT_INSPECTOR_WIDTH,
  InspectionPanel,
} from "../../src/features/inspection_panel";
import type { GraphSessionStore } from "../../src/state/graph-session";

type ControlledWidth = {
  width: number;
  onWidthChange: (width: number) => void;
};

export function renderInspectionPanel(
  store: GraphSessionStore,
  options?: {
    initialWidth?: number;
    onHide?: () => void;
    controlled?: ControlledWidth;
  },
) {
  if (options?.controlled) {
    return render(
      <InspectionPanel
        store={store}
        width={options.controlled.width}
        onWidthChange={options.controlled.onWidthChange}
        onHide={options.onHide}
      />,
    );
  }

  function Wrapper() {
    const [width, setWidth] = useState(
      options?.initialWidth ?? DEFAULT_INSPECTOR_WIDTH,
    );
    return (
      <InspectionPanel
        store={store}
        width={width}
        onWidthChange={setWidth}
        onHide={options?.onHide}
      />
    );
  }

  return render(<Wrapper />);
}
