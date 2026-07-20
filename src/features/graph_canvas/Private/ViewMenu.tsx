// @Architecture(descriptionShort="Toolbar View menu: test filter, heatmap toggles, and diff entry")
import {
  DropdownMenu,
  MenuActionItem,
  MenuCheckboxItem,
  MenuRadioItem,
  MenuSeparator,
} from "../../../ui/dropdown_menu";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import type { HeatmapMode } from "../../../domain/graph";
import { CanvasUiState } from "./canvas-ui-state";

interface ViewMenuProps {
  store: GraphSessionStore;
  ui: CanvasUiState;
}

/** Toolbar dropdown for canvas view options (hide tests, heatmap, diff overlay). */
export function ViewMenu({ store, ui }: ViewMenuProps) {
  const session = useGraphSession(store);
  const gitAvailable = session.getIsGitRepo() === true;
  const loading = session.getPhase() === "loading";
  const heatmapEnabled = session.getHeatmapEnabled();
  const heatmapUsable = heatmapEnabled && gitAvailable && !loading;
  const diffActive = !!session.getDiffOverlay();

  return (
    <DropdownMenu label="View">
      <MenuCheckboxItem
        label="Hide tests"
        checked={session.getHideTests()}
        onChange={(hide) => store.setHideTests(hide)}
      />
      <MenuCheckboxItem
        label={loading ? "Computing heatmap…" : "Heatmap"}
        checked={heatmapEnabled}
        onChange={(enabled) => store.setHeatmapEnabled(enabled)}
        disabled={!gitAvailable || loading}
        disabledReason={gitAvailable ? "Computing heatmap…" : "Requires a git repository"}
      />
      {heatmapUsable && (
        <>
          <HeatmapModeRadio store={store} mode="activity" label="Activity" />
          <HeatmapModeRadio store={store} mode="risk" label="Risk" />
        </>
      )}
      {!diffActive && (
        <>
          <MenuSeparator />
          <MenuActionItem
            label="Visualize diff…"
            onSelect={() => ui.setDiffModalOpen(/*open=*/true)}
          />
        </>
      )}
    </DropdownMenu>
  );
}

interface HeatmapModeRadioProps {
  store: GraphSessionStore;
  mode: HeatmapMode;
  label: string;
}

function HeatmapModeRadio({ store, mode, label }: HeatmapModeRadioProps) {
  return (
    <MenuRadioItem
      label={label}
      checked={store.getHeatmapMode() === mode}
      onSelect={() => store.setHeatmapMode(mode)}
      indent
    />
  );
}
