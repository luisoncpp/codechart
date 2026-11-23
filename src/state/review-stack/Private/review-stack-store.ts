// @Architecture(descriptionShort="Event-emitting store for persisted Review Stacks, spotlight, blast radius, and findings")
import type {
  AgentDiffNote,
  CohortHunk,
  DiffImpactReport,
  FindingSeverity,
  FindingStatus,
  ReviewFinding,
  ReviewStackClient,
  ReviewStackRecord,
} from "../../../ipc/review-stack-client";
import {
  cohortHunksFor,
  cohortModuleIds,
  emptyStack,
  replaceStack,
  withDiffNotes,
  withFindings,
  withFindingStatus,
  type StackInput,
} from "./stack-mutations";
import { StackRequests } from "./stack-requests";

export type SpotlightMode = "dim-others" | "highlight" | "off";
type StackDrawerTab = "overview" | "findings" | "impact";

export interface BlastRadiusState {
  rootModuleId: string;
  depths: ReadonlyMap<string, number>;
}

export class ReviewStackStore {
  private listeners = new Set<() => void>();
  private version = 0;
  private root: string | null = null;
  private diffId: string | null = null;
  private stack: ReviewStackRecord | null = null;
  private impact: DiffImpactReport | null = null;
  private activeCohortId: string | null = null;
  private spotlightMode: SpotlightMode = "off";
  private blastRadius: BlastRadiusState | null = null;
  private severityFilter: FindingSeverity | "all" = "all";
  private drawerOpen = false;
  private activeTab: StackDrawerTab = "overview";
  private readonly requests = new StackRequests();

  constructor(private readonly client: ReviewStackClient) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = () => this.version;
  getDiffId = () => this.diffId;
  getStack = () => this.stack;
  getImpact = () => this.impact;
  getActiveCohortId = () => this.activeCohortId;
  getSpotlightMode = () => this.spotlightMode;
  getBlastRadius = () => this.blastRadius;
  getSeverityFilter = () => this.severityFilter;
  getDrawerOpen = () => this.drawerOpen;
  getActiveTab = () => this.activeTab;
  getNavigationRequest = () => this.requests.navigation;
  getExplanationRequest = () => this.requests.explanation;

  getSpotlightModuleIds(): ReadonlySet<string> | null {
    if (this.spotlightMode === "off") return null;
    const cohort = this.activeCohort();
    return cohort ? new Set(cohortModuleIds(cohort)) : null;
  }

  /** The spotlighted cohort's line ranges in `path` (empty when nothing is spotlighted). */
  activeCohortRangesFor(path: string): CohortHunk[] {
    const cohort = this.spotlightMode === "off" ? undefined : this.activeCohort();
    return cohort ? cohortHunksFor(cohort, path) : [];
  }

  findingsFor(path: string): ReviewFinding[] {
    if (!this.stack) return [];
    return this.stack.findings.filter((f) => f.path === path && f.status !== "dismissed");
  }

  diffNotesFor(path: string): AgentDiffNote[] {
    return this.stack?.diffNotes?.filter((n) => n.path === path) ?? [];
  }

  async activateDiff(root: string, diffId: string): Promise<void> {
    this.root = root;
    this.diffId = diffId;
    this.resetTransient();
    const loaded = await this.client.loadStack(root, diffId).catch(() => null);
    if (this.root !== root || this.diffId !== diffId) return;
    this.stack = loaded;
    this.drawerOpen = Boolean(loaded);
    this.notify();
  }

  clearActiveDiff() {
    this.diffId = null;
    this.stack = null;
    this.impact = null;
    this.drawerOpen = false;
    this.resetTransient();
    this.notify();
  }

  async setStack(input: StackInput): Promise<ReviewStackRecord> {
    const diffId = this.requireDiff();
    const next = replaceStack(diffId, this.stack, input);
    this.activeTab = "overview";
    await this.save(next);
    return next;
  }

  async upsertFindings(findings: ReviewFinding[]): Promise<ReviewFinding[]> {
    const next = withFindings(this.stack ?? emptyStack(this.requireDiff()), findings);
    await this.save(next);
    return next.findings;
  }

  async upsertDiffNotes(notes: AgentDiffNote[]): Promise<AgentDiffNote[]> {
    const next = withDiffNotes(this.stack ?? emptyStack(this.requireDiff()), notes);
    await this.save(next);
    return next.diffNotes ?? [];
  }

  async resolveFinding(findingId: string, status: FindingStatus): Promise<boolean> {
    if (!this.root || !this.stack) return false;
    const next = withFindingStatus(this.stack, findingId, status);
    if (!next) return false;
    await this.client.saveStack(this.root, next);
    this.stack = next;
    this.notify();
    return true;
  }

  async clearStack(): Promise<void> {
    if (this.root && this.diffId) await this.client.deleteStack(this.root, this.diffId);
    this.dropStack();
  }

  async clearAll(root: string): Promise<void> {
    await this.client.clearStacks(root);
    this.dropStack();
  }

  setImpact = (impact: DiffImpactReport | null) => this.update(() => (this.impact = impact));
  setSeverityFilter = (filter: FindingSeverity | "all") => this.update(() => (this.severityFilter = filter));
  setDrawerOpen = (open: boolean) => this.update(() => (this.drawerOpen = open));
  setActiveTab = (tab: StackDrawerTab) => this.update(() => (this.activeTab = tab));

  focusCohort(cohortId: string | null, mode: SpotlightMode = "dim-others") {
    this.activeCohortId = cohortId;
    this.spotlightMode = cohortId ? mode : "off";
    this.notify();
  }

  setBlastRadius(rootModuleId: string, depths: ReadonlyMap<string, number>) {
    this.update(() => (this.blastRadius = { rootModuleId, depths }));
  }

  clearBlastRadius() {
    if (this.blastRadius) this.update(() => (this.blastRadius = null));
  }

  requestNavigate(req: { path: string; line?: number; symbol?: string; openPreview?: boolean }) {
    this.requests.navigate(req);
    this.notify();
  }

  consumeNavigation = (seq: number) => this.requests.consumeNavigation(seq);
  consumeExplanation = (seq: number) => this.requests.consumeExplanation(seq);

  /** False when the cohort is unknown or has no explanation. */
  requestExplanation(cohortId: string): boolean {
    const opened = this.requests.explain(this.stack?.cohorts.find((c) => c.id === cohortId));
    if (opened) this.notify();
    return opened;
  }

  private activeCohort() {
    if (!this.activeCohortId) return undefined;
    return this.stack?.cohorts.find((c) => c.id === this.activeCohortId);
  }

  private requireDiff(): string {
    if (!this.root || !this.diffId) throw new Error("No active diff overlay in CodeChart.");
    return this.diffId;
  }

  /** Persist, then adopt as current, reveal the drawer, and notify. */
  private async save(next: ReviewStackRecord) {
    await this.client.saveStack(this.root!, next);
    this.stack = next;
    this.drawerOpen = true;
    this.notify();
  }

  private dropStack() {
    this.stack = null;
    this.resetTransient();
    this.notify();
  }

  private resetTransient() {
    this.activeCohortId = null;
    this.spotlightMode = "off";
    this.blastRadius = null;
    this.severityFilter = "all";
    this.requests.clear();
  }

  private update(mutate: () => unknown) {
    mutate();
    this.notify();
  }

  private notify() {
    this.version += 1;
    for (const fn of this.listeners) fn();
  }
}
