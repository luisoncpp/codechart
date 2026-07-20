// @Architecture(descriptionShort="Mode-agnostic find-bar result: matched module paths in module order")

/** What both search modes produce: navigable module paths. */
export interface BarResult {
  paths: string[];
  /** True when the backend clipped the result set at its match cap. */
  truncated: boolean;
}
