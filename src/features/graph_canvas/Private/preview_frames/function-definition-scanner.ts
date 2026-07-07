// @Architecture(descriptionShort="Scans source text for function and method definition lines")

/**
 * Heuristic, language-tolerant scan: keyword-declared functions
 * (`function` / `fn` / `def`) plus class/impl methods and C++ qualified
 * definitions recognized by line shape (`name(args…) {`). It intentionally
 * skips declarations (`…);`), calls (`;`, string args), and callbacks (`=>`).
 */
export function scanFunctionDefinitions(source: string): Map<string, number> {
  const definitions = new Map<string, number>();
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const name = definitionNameOf(lines[i].trim());
    if (name && !definitions.has(name)) definitions.set(name, i);
  }
  return definitions;
}

const FUNCTION_KEYWORD_PATTERNS = [
  // TS/JS: export default async function* name(
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/,
  // Rust: pub(crate) const async unsafe extern "C" fn name(
  /^(?:pub(?:\([^)]*\))?\s+)?(?:const\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s+"[^"]*"\s+)?fn\s+([A-Za-z_]\w*)/,
  // Python: async def name(
  /^(?:async\s+)?def\s+([A-Za-z_]\w*)/,
];

/**
 * Optional modifier/return-type prefix (ends in whitespace or `::`),
 * then the candidate name, then its parameter list opener.
 */
const METHOD_SHAPE = /^([A-Za-z_$][\w$<>:*&,\s]*[\s:])?([A-Za-z_$][\w$]*)\s*\((.*)$/;

/**
 * Words that open control flow or expressions — never a definition name or
 * modifier. `void` is deliberately absent: it is C++'s most common return
 * type, and the TS `void expr` operator form nearly always ends in `;`.
 */
const CONTROL_WORDS = new Set([
  "if", "else", "for", "while", "switch", "match", "catch", "do",
  "return", "await", "new", "throw", "yield", "typeof", "delete",
  "case", "in", "of", "not", "and", "or", "assert", "sizeof",
]);

function definitionNameOf(line: string): string | null {
  for (const pattern of FUNCTION_KEYWORD_PATTERNS) {
    const match = line.match(pattern);
    if (match) return match[1];
  }
  return methodDefinitionName(line);
}

/**
 * A method definition line either closes its signature and opens the body
 * (`… name(args) … {`) or leaves a multi-line signature open (`name(` / `,`)
 * behind an explicit modifier/return-type prefix — a bare `name(` at the end
 * of a line is indistinguishable from a call, so it does not count.
 */
function methodDefinitionName(line: string): string | null {
  if (line.includes(";") || line.includes("=>")) return null;
  const match = line.match(METHOD_SHAPE);
  if (!match) return null;
  const [, prefix, name, args] = match;
  if (CONTROL_WORDS.has(name) || prefixHasControlWord(prefix)) return null;
  if (/['"`]/.test(args)) return null;
  if (line.endsWith("{")) return name;
  const openSignature = line.endsWith("(") || line.endsWith(",");
  return openSignature && prefix ? name : null;
}

function prefixHasControlWord(prefix: string | undefined): boolean {
  if (!prefix) return false;
  return prefix
    .split(/[\s<>:*&,]+/)
    .some((word) => CONTROL_WORDS.has(word));
}
