// @Architecture(descriptionShort="Event-emitting store for persisted Review Stacks, spotlight, blast radius, and findings")
import type {
  DiffImpactReport,
  FindingSeverity,
  FindingStatus,
  ReviewBlocker,
  ReviewCohort,
  ReviewFinding,
  ReviewStackClient,
  ReviewStackRecord,
} from "../../../ipc/review-stack-client";

export type SpotlightMode = "dim-others" | "highlight" | "off";
export type StackDrawerTab = "overview" | "findings" | "impact";

export interface BlastRadiusState {
  rootModuleId: string;
  depths: ReadonlyMap<string, number>;
}

export interface StackNavigationRequest {
  seq: number;
  path: string;
  line?: number;
  symbol?: string;
  openPreview: boolean;
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
  private navSeq = 0;
  private navRequest: StackNavigationRequest | null = null;

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
  getNavigationRequest = () => this.navRequest;

  getSpotlightModuleIds(): ReadonlySet<string> | null {
    if (!this.activeCohortId || this.spotlightMode === "off" || !this.stack) return null;
    const cohort = this.stack.cohorts.find((c) => c.id === this.activeCohortId);
    return cohort ? new Set(cohort.moduleIds) : null;
  }

  findingsFor(path: string): ReviewFinding[] {
    if (!this.stack) return [];
    return this.stack.findings.filter((f) => f.path === path && f.status !== "dismissed");
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

  async setStack(input: {
    title: string;
    summary: string;
    cohorts: ReviewCohort[];
    blockers: ReviewBlocker[];
  }): Promise<ReviewStackRecord> {
    if (!this.root || !this.diffId) throw new Error("No active diff overlay in CodeChart.");
    const next: ReviewStackRecord = {
      diffId: this.diffId,
      title: input.title,
      summary: input.summary,
      cohorts: input.cohorts,
      blockers: input.blockers,
      findings: this.stack?.findings ?? [],
    };
    await this.client.saveStack(this.root, next);
    this.stack = next;
    this.drawerOpen = true;
    this.activeTab = "overview";
    this.notify();
    return next;
  }

  async upsertFindings(findings: ReviewFinding[]): Promise<ReviewFinding[]> {
    if (!this.root || !this.diffId) throw new Error("No active diff overlay in CodeChart.");
    const base: ReviewStackRecord = this.stack ?? {
      diffId: this.diffId,
      title: "MR Review",
      summary: "",
      cohorts: [],
      blockers: [],
      findings: [],
    };
    const byId = new Map(base.findings.map((f) => [f.id, f]));
    for (const f of findings) byId.set(f.id, { ...f, status: f.status ?? "open" });
    const next: ReviewStackRecord = { ...base, findings: [...byId.values()] };
    await this.client.saveStack(this.root, next);
    this.stack = next;
    this.drawerOpen = true;
    this.notify();
    return next.findings;
  }

  async resolveFinding(findingId: string, status: FindingStatus): Promise<boolean> {
    if (!this.root || !this.stack) return false;
    let found = false;
    const findings = this.stack.findings.map((f) => {
      if (f.id !== findingId) return f;
      found = true;
      return { ...f, status };
    });
    if (!found) return false;
    const next = { ...this.stack, findings };
    await this.client.saveStack(this.root, next);
    this.stack = next;
    this.notify();
    return true;
  }

  async clearStack(): Promise<void> {
    if (this.root && this.diffId) await this.client.deleteStack(this.root, this.diffId);
    this.stack = null;
    this.resetTransient();
    this.notify();
  }

  async clearAll(root: string): Promise<void> {
    await this.client.clearStacks(root);
    this.stack = null;
    this.resetTransient();
    this.notify();
  }

  setImpact(impact: DiffImpactReport | null) {
    this.impact = impact;
    this.notify();
  }

  focusCohort(cohortId: string | null, mode: SpotlightMode = "dim-others") {
    this.activeCohortId = cohortId;
    this.spotlightMode = cohortId ? mode : "off";
    this.notify();
  }

  setBlastRadius(rootModuleId: string, depths: ReadonlyMap<string, number>) {
    this.blastRadius = { rootModuleId, depths };
    this.notify();
  }

  clearBlastRadius() {
    if (!this.blastRadius) return;
    this.blastRadius = null;
    this.notify();
  }

  setSeverityFilter(filter: FindingSeverity | "all") {
    this.severityFilter = filter;
    this.notify();
  }

  setDrawerOpen(open: boolean) {
    this.drawerOpen = open;
    this.notify();
  }

  setActiveTab(tab: StackDrawerTab) {
    this.activeTab = tab;
    this.notify();
  }

  requestNavigate(req: { path: string; line?: number; symbol?: string; openPreview?: boolean }) {
    this.navSeq += 1;
    this.navRequest = {
      seq: this.navSeq,
      path: req.path,
      line: req.line,
      symbol: req.symbol,
      openPreview: req.openPreview ?? true,
    };
    this.notify();
  }

  consumeNavigation(seq: number) {
    if (this.navRequest?.seq === seq) this.navRequest = null;
  }

  private resetTransient() {
    this.activeCohortId = null;
    this.spotlightMode = "off";
    this.blastRadius = null;
    this.severityFilter = "all";
    this.navRequest = null;
  }

  private notify() {
    this.version += 1;
    for (const fn of this.listeners) fn();
  }
}
