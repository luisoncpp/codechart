import type { ProjectGraph } from "../../../domain/graph";
import type {
  ReviewNote,
  ReviewNoteFilter,
  ReviewNoteNavigationRequest,
  ReviewNotesClient,
  ReviewNotesDocument,
} from "../../../ipc/review-notes-client";

type Phase = "idle" | "loading" | "ready" | "failed";
type Listener = () => void;
const EMPTY: ReviewNotesDocument = { version: 1, notes: [] };

export class ReviewNotesStore {
  private document: ReviewNotesDocument = EMPTY;
  private phase: Phase = "idle";
  private error: string | null = null;
  private root: string | null = null;
  private graph: ProjectGraph | null = null;
  private filter: ReviewNoteFilter = { kind: "all" };
  private listeners = new Set<Listener>();
  private loadSeq = 0;
  private saveInFlight = false;
  private pending: ReviewNotesDocument | null = null;
  private debounce: ReturnType<typeof setTimeout> | null = null;
  private undo: { note: ReviewNote; index: number } | null = null;
  private undoTimer: ReturnType<typeof setTimeout> | null = null;
  private navigation: ReviewNoteNavigationRequest | null = null;
  private navigationSeq = 0;
  private draft: { path: string; startLine: number; endLine: number; anchorLines: string[] } | null = null;
  private validation: string | null = null;

  constructor(private client: ReviewNotesClient) {}
  getDocument = () => this.document;
  getPhase = () => this.phase;
  getError = () => this.error;
  getFilter = () => this.filter;
  getNavigationRequest = () => this.navigation;
  getDraft = () => this.draft;
  getValidation = () => this.validation;
  onChange(listener: Listener) { this.listeners.add(listener); }
  offChange(listener: Listener) { this.listeners.delete(listener); }

  consumeNavigationRequest(seq: number) {
    if (this.navigation?.seq !== seq) return false;
    this.navigation = null;
    return true;
  }

  async loadProject(input: { root: string; graph: ProjectGraph }) {
    const seq = ++this.loadSeq;
    this.root = input.root;
    this.graph = input.graph;
    this.document = EMPTY;
    this.phase = "loading";
    this.error = null;
    this.draft = null;
    this.navigation = null;
    this.emit();
    try {
      const document = await this.client.loadReviewNotes(input.root, input.graph.modules.map((module) => module.path));
      if (seq !== this.loadSeq) return;
      this.document = document;
      this.phase = "ready";
    } catch (error) {
      if (seq !== this.loadSeq) return;
      this.phase = "failed";
      this.error = error instanceof Error ? error.message : String(error);
    }
    this.emit();
  }

  retryLoad() {
    if (!this.root || !this.graph) return;
    void this.loadProject({ root: this.root, graph: this.graph });
  }

  notesFor(path: string) { return this.document.notes.filter((note) => note.path === path); }
  filteredNotes() {
    if (!this.graph || this.filter.kind === "all") return this.document.notes;
    const ids = this.filter.kind === "module"
      ? new Set([this.filter.moduleId])
      : descendantModuleIds(this.graph, this.filter.groupId);
    const paths = new Set(this.graph.modules.filter((module) => ids.has(module.id)).map((module) => module.path));
    return this.document.notes.filter((note) => paths.has(note.path));
  }
  countForModule(moduleId: string) {
    const path = this.graph?.modules.find((module) => module.id === moduleId)?.path;
    return path ? this.notesFor(path).length : 0;
  }
  countForGroup(groupId: string) {
    return [...descendantModuleIds(this.graph, groupId)].reduce((count, id) => count + this.countForModule(id), 0);
  }
  showAll() { this.filter = { kind: "all" }; this.emit(); }
  filterModule(moduleId: string) { this.filter = { kind: "module", moduleId }; this.emit(); }
  filterGroup(groupId: string) { this.filter = { kind: "group", groupId }; this.emit(); }

  beginDraft(input: { path: string; startLine: number; endLine: number; anchorLines: string[] }) {
    this.draft = input;
    this.validation = null;
    this.emit();
  }
  confirmDraft(body: string) {
    if (!this.draft) return;
    if (!body.trim()) { this.validation = "Review Note text is required."; this.emit(); return; }
    this.validation = null;
    const note: ReviewNote = { id: crypto.randomUUID(), ...this.draft, body };
    this.draft = null;
    this.mutate([...this.document.notes, note], /*immediate=*/true);
  }
  cancelDraft() { if (!this.draft) return; this.draft = null; this.validation = null; this.emit(); }
  editBody(id: string, body: string) {
    if (!body.trim()) { this.validation = "Review Note text is required."; this.emit(); return; }
    this.validation = null;
    this.mutate(this.document.notes.map((note) => note.id === id ? { ...note, body } : note), /*immediate=*/false);
  }
  done(id: string) {
    const index = this.document.notes.findIndex((note) => note.id === id);
    if (index < 0) return;
    if (this.navigation?.id === id) this.navigation = null;
    this.undo = { note: this.document.notes[index]!, index };
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(/*expireUndo*/ () => { this.undo = null; this.emit(); }, /*delayInMs=*/5000);
    this.mutate(this.document.notes.filter((note) => note.id !== id), /*immediate=*/true);
  }
  undoDone() {
    if (!this.undo) return;
    const { note, index } = this.undo;
    this.undo = null;
    if (this.undoTimer) clearTimeout(this.undoTimer);
    const notes = [...this.document.notes]; notes.splice(index, 0, note);
    this.mutate(notes, /*immediate=*/true);
  }
  canUndo = () => this.undo !== null;
  retrySave() { if (!this.pending) this.pending = this.document; void this.flushSave(); }
  navigate(note: ReviewNote) {
    this.navigation = { id: note.id, path: note.path, startLine: note.startLine, endLine: note.endLine, seq: ++this.navigationSeq };
    this.emit();
  }

  private mutate(notes: ReviewNote[], immediate: boolean) {
    this.document = { version: 1, notes };
    this.pending = this.document;
    if (this.debounce) clearTimeout(this.debounce);
    if (immediate) void this.flushSave();
    else this.debounce = setTimeout(/*saveBodyEdit*/ () => void this.flushSave(), /*delayInMs=*/400);
    this.emit();
  }
  private async flushSave() {
    if (this.saveInFlight || !this.pending || !this.root) return;
    const snapshot = this.pending;
    this.pending = null;
    this.saveInFlight = true;
    try { await this.client.saveReviewNotes(this.root, snapshot); this.error = null; }
    catch (error) { this.pending = snapshot; this.error = error instanceof Error ? error.message : String(error); }
    finally { this.saveInFlight = false; this.emit(); }
    if (this.pending && this.error === null) void this.flushSave();
  }
  private emit() { this.listeners.forEach((listener) => listener()); }
}

function descendantModuleIds(graph: ProjectGraph | null, groupId: string): Set<string> {
  if (!graph) return new Set();
  const groups = new Set([groupId]);
  let changed = true;
  while (changed) { changed = false; for (const group of graph.groups) if (group.parentId && groups.has(group.parentId) && !groups.has(group.id)) { groups.add(group.id); changed = true; } }
  return new Set(graph.modules.filter((module) => module.groupId && groups.has(module.groupId)).map((module) => module.id));
}
