import type { Language } from "../Language";

/** Heuristic export category — inferred from name (+ module language) until the adapter carries AST kinds. */
export type SymbolKind =
  | "default"
  | "interface"
  | "type"
  | "class"
  | "component"
  | "hook"
  | "predicate"
  | "function"
  | "constant";

const TYPE_SUFFIX =
  /(?:Type|Result|Config|Options|Props|State|Shape|Payload|Response|Request|Params|Entry|Record|Map|Dict|Enum)$/;

const CLASS_SUFFIX =
  /(?:Store|Service|Manager|Controller|Repository|Client|Handler|Provider|Builder|Factory|Adapter|Emitter|Dispatcher)$/;

/** Classify an exported symbol name for canvas styling. */
export function inferSymbolKind(name: string, language?: Language): SymbolKind {
  if (name === "default") return "default";

  if (/^use[A-Z]/.test(name)) return "hook";
  if (/^I[A-Z]/.test(name)) return "interface";
  if (/^(is|has|can|should|will)[A-Z]/.test(name)) return "predicate";

  if (/^[A-Z][A-Z0-9_]+$/.test(name)) return "constant";

  if (/^[A-Z]/.test(name)) {
    if (language === "tsx") return "component";
    if (TYPE_SUFFIX.test(name)) return "type";
    if (CLASS_SUFFIX.test(name)) return "class";
    // Short PascalCase nouns in .ts are usually domain types, not classes.
    if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return "type";
    return "class";
  }

  return "function";
}
