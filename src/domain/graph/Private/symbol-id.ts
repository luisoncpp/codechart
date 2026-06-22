// @Architecture(descriptionShort="Utility functions for parsing and creating symbol IDs")
/** Stable layout id for a symbol box nested under its module. */
export function symbolBoxId(moduleId: string, symbolName: string): string {
  return `${moduleId}::${symbolName}`;
}

/** Read the exported symbol name from a layout / RF node id. */
export function symbolNameFromId(id: string): string {
  const sep = id.indexOf("::");
  return sep >= 0 ? id.slice(sep + 2) : id;
}
