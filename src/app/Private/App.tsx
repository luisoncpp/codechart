// @Architecture(descriptionShort="Root React App component containing the layout and canvas")
import { useEffect, useMemo, useState } from "react";
import { createTauriAnalysisClient } from "../../ipc/analysis-client";
import {
  DEFAULT_EDITOR,
  createTauriProjectConfigClient,
} from "../../ipc/project-config-client";
import { createTauriGitClient } from "../../ipc/git-client";
import { createTauriShellClient } from "../../ipc/shell-client";
import { createTauriDiffReviewClient } from "../../ipc/diff-review-client";
import { createTauriStartupClient } from "../../ipc/startup-client";
import { createTauriDevtoolsClient } from "../../ipc/devtools-client";
import { ElkLayoutEngine } from "../../domain/layout";
import { GraphSessionStore, useGraphSession } from "../../state/graph-session";
import { ReviewNotesStore, useReviewNotes } from "../../state/review-notes";
import { createTauriReviewNotesClient } from "../../ipc/review-notes-client";
import { ReviewNotesProvider } from "../../features/review_notes";
import { ProjectLoaderPanel } from "../../features/project_loader";
import { SettingsMenu } from "../../features/project_settings";
import { CanvasUiState, GraphCanvas, SearchMenu, ViewMenu } from "../../features/graph_canvas";
import {
  DEFAULT_INSPECTOR_WIDTH,
  InspectionPanel,
} from "../../features/inspection_panel";
import { useOpenStartupProject } from "./use-open-startup-project";
import { useDevtoolsShortcut } from "./use-devtools-shortcut";

export function App() {
  const devtools = useMemo(/*build devtools client*/ () => createTauriDevtoolsClient(), []);
  useDevtoolsShortcut(devtools);
  const git = useMemo(/*build git client*/ () => createTauriGitClient(), []);
  const config = useMemo(
    /*build config client*/ () => createTauriProjectConfigClient(),
    [],
  );
  const shell = useMemo(/*build shell client*/ () => createTauriShellClient(), []);
  const startup = useMemo(/*build startup client*/ () => createTauriStartupClient(), []);
  const store = useMemo(
    /*build session store*/ () =>
      new GraphSessionStore(createTauriAnalysisClient(), git, new ElkLayoutEngine(), createTauriDiffReviewClient()),
    [git],
  );
  const session = useGraphSession(store);
  useOpenStartupProject(store, startup);
  const projectRoot = session.getProjectRoot();
  const graph = session.getGraph();
  const reviewNotes = useMemo(/*build review notes store*/ () => new ReviewNotesStore(createTauriReviewNotesClient()), []);
  useReviewNotes(reviewNotes);
  const canvasUi = useMemo(/*build canvas ui state*/ () => new CanvasUiState(), []);
  const ready = session.getPhase() === "ready";
  const [editor, setEditor] = useState(DEFAULT_EDITOR);
  const hasCppModules = graph?.modules.some((module) => module.language === "cpp") ?? false;

  useEffect(() => {
    if (!projectRoot) {
      setEditor(DEFAULT_EDITOR);
      return;
    }
    let active = true;
    setEditor(DEFAULT_EDITOR);
    config
      .readProjectConfig(projectRoot)
      .then((projectConfig) => active && setEditor(projectConfig.editor))
      .catch(() => active && setEditor(DEFAULT_EDITOR));
    return () => {
      active = false;
    };
  }, [config, projectRoot]);

  useEffect(/*closeCanvasChromeOnPhaseChange*/ () => {
    const reset = () => canvasUi.reset();
    store.on("phase-changed", reset);
    return () => store.off("phase-changed", reset);
  }, [store, canvasUi]);
  const [inspectorOpen, setInspectorOpen] = useState(/*defaultOpen=*/true);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const [activeTab, setActiveTab] = useState<"inspector" | "review-notes">("inspector");

  useEffect(() => {
    const graph = session.getGraph();
    const root = session.getProjectRoot();
    if (ready && graph && root) void reviewNotes.loadProject({ root, graph });
  }, [ready, session, reviewNotes]);

  return (
    <div style={appShellStyle}>
      <ProjectLoaderPanel
        store={store}
        menus={
          projectRoot ? (
            <>
              {ready && (
                <>
                  <ViewMenu store={store} ui={canvasUi} />
                  <SearchMenu ui={canvasUi} />
                </>
              )}
              <SettingsMenu
                root={projectRoot}
                editor={editor}
                hasCppModules={hasCppModules}
                client={config}
                onEditorSaved={setEditor}
                onCppConfigSaved={() => store.loadProject(projectRoot)}
                onClearReviewInfo={/*clear notes and checkmarks*/ async () => {
                  reviewNotes.clearAll();
                  await store.clearAllDiffReviews();
                }}
              />
            </>
          ) : null
        }
      />
      {ready && (
        <ReviewNotesProvider store={reviewNotes}>
        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <GraphCanvas store={store} git={git} shell={shell} editor={editor} ui={canvasUi} reviewNotes={reviewNotes} onShowReviewNotes={() => { setInspectorOpen(true); setActiveTab("review-notes"); }} />
          </div>
          {inspectorOpen ? (
            <InspectionPanel
              store={store}
              width={inspectorWidth}
              onWidthChange={setInspectorWidth}
              onHide={() => setInspectorOpen(false)}
              reviewNotes={reviewNotes}
              activeTab={activeTab}
              onTabChange={(tab) => { setActiveTab(tab); if (tab === "review-notes") reviewNotes.showAll(); }}
            />
          ) : (
            <button
              type="button"
              aria-label="Show inspector"
              title="Show inspector"
              onClick={() => setInspectorOpen(true)}
              style={showInspectorBtnStyle}
            >
              ◀
            </button>
          )}
        </div></ReviewNotesProvider>
      )}
    </div>
  );
}

const appShellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

const showInspectorBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 28,
  border: "none",
  borderLeft: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  fontSize: 11,
  cursor: "pointer",
};
