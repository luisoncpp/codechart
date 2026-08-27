// @Architecture(descriptionShort="Toolbar View menu: test/dot-dir filters, line counts, heatmap toggles, arrow visibility submenu, and diff entry")
import {
  DropdownMenu,
  MenuActionItem,
  MenuCheckboxItem,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenu,
} from "../../../../ui/dropdown_menu";
import { GraphSessionStore, useGraphSession } from "../../../../state/graph-session";
import type { HeatmapMode } from "../../../../domain/graph";
import {
  ArrowVisibility,
  CanvasUiState,
  useCanvasUiState,
} from "../controller/canvas-ui-state";

interface ViewMenuProps {
  store: GraphSessionStore;
  ui: CanvasUiState;
  plugins?: { hidden: boolean; onChange: (hide: boolean) => void };
}

/** Toolbar dropdown for canvas view options (hide tests, heatmap, diff entry). */
export function ViewMenu({ store, ui, plugins }: ViewMenuProps) {
  const session = useGraphSession(store);
  const uiState = useCanvasUiState(ui);
  const gitAvailable = session.getIsGitRepo() === true;
  const loading = session.getPhase() === "loading";
  const heatmapEnabled = session.getHeatmapEnabled();
  const heatmapUsable = heatmapEnabled && !loading;
  const diffActive = !!session.getDiffOverlay();
  const arrowVisibility = uiState.getArrowVisibility();

  return (
    <DropdownMenu label="View">
      <MenuCheckboxItem
        label="Hide tests"
        checked={session.getHideTests()}
        onChange={(hide) => store.setHideTests(hide)}
      />
      <MenuCheckboxItem
        label="Hide dot directories"
        checked={session.getHideDotDirectories()}
        onChange={(hide) => void store.setHideDotDirectories(hide)}
      />
      {plugins && (
        <MenuCheckboxItem
          label="Hide plugins"
          checked={plugins.hidden}
          onChange={plugins.onChange}
        />
      )}
      <MenuCheckboxItem
        label="Line counts"
        checked={uiState.getLineCountsVisible()}
        onChange={(visible) => ui.setLineCountsVisible(visible)}
      />
      <MenuCheckboxItem
        label={loading ? "Computing heatmap…" : "Heatmap"}
        checked={heatmapEnabled}
        onChange={(enabled) => store.setHeatmapEnabled(enabled)}
        disabled={loading}
        disabledReason="Computing heatmap…"
      />
      {heatmapUsable && (
        <>
          <HeatmapModeRadio
            store={store}
            mode="activity"
            label="Activity"
            disabled={!gitAvailable}
          />
          <HeatmapModeRadio
            store={store}
            mode="risk"
            label="Risk"
            disabled={!gitAvailable}
          />
          <HeatmapModeRadio store={store} mode="instability" label="Instability" />
        </>
      )}
      <MenuSeparator />
      <ArrowVisibilitySubmenu ui={ui} current={arrowVisibility} />
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

interface ArrowVisibilitySubmenuProps {
  ui: CanvasUiState;
  current: ArrowVisibility;
}

function ArrowVisibilitySubmenu({ ui, current }: ArrowVisibilitySubmenuProps) {
  return (
    <MenuSubmenu label="Arrow visibility">
      <MenuRadioItem
        label="Show all"
        checked={current === "all"}
        onSelect={() => ui.setArrowVisibility("all")}
      />
      <MenuRadioItem
        label="Hide arrow heads for non-selected modules"
        checked={current === "hide-non-selected-heads"}
        onSelect={() => ui.setArrowVisibility("hide-non-selected-heads")}
      />
      <MenuRadioItem
        label="Hide entire arrows for non-selected modules"
        checked={current === "hide-non-selected-arrows"}
        onSelect={() => ui.setArrowVisibility("hide-non-selected-arrows")}
      />
    </MenuSubmenu>
  );
}

interface HeatmapModeRadioProps {
  store: GraphSessionStore;
  mode: HeatmapMode;
  label: string;
  disabled?: boolean;
}

function HeatmapModeRadio({ store, mode, label, disabled }: HeatmapModeRadioProps) {
  return (
    <MenuRadioItem
      label={label}
      checked={store.getHeatmapMode() === mode}
      onSelect={() => store.setHeatmapMode(mode)}
      indent
      disabled={disabled}
      disabledReason="Requires a git repository"
    />
  );
}
