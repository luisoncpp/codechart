// @Architecture(descriptionShort="Service type definitions")
export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
}

// Contract for the domain store — imported by UI layers that depend on the
// store indirectly (cross-group interface seam, no direct import to core).
export interface ITodoStore {
  add(title: string): void;
  all(): unknown[];
  toggle(id: string): void;
}
