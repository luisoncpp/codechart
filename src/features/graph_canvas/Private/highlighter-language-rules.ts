// @Architecture(descriptionShort="Per-language syntax-highlighting rule sets for highlighter.ts")
import {
  BASIC_FUNCTION_RULE,
  BASIC_TYPE_RULE,
  CPP_FUNCTION_RULE,
  CPP_OPERATOR_RULE,
  GO_OPERATOR_RULE,
  PYTHON_OPERATOR_RULE,
  RUST_OPERATOR_RULE,
  STANDARD_OPERATOR_RULE,
  tokenTailRules,
} from "./highlighter-rules";
import type { Rule } from "./highlighter";

const jsRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'|^`(?:[^`\\]|\\.)*`/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F]+\b|^\b0b[01]+\b|^\b\d+(?:\.\d+)?\b/ },
  { type: "keyword", regex: /^\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|as|implements|interface|let|package|private|protected|public|static|any|boolean|constructor|declare|get|module|require|number|readonly|set|string|symbol|type|from|of|async|await)\b/ },
  { type: "builtin", regex: /^\b(console|window|document|process|global|Map|Set|Promise|Error|Object|Array|Function)\b/ },
  BASIC_TYPE_RULE,
  BASIC_FUNCTION_RULE,
  STANDARD_OPERATOR_RULE,
  ...tokenTailRules([{ type: "decorator", regex: /^@[a-zA-Z0-9_]+/ }]),
];

const rustRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^r#"(?:(?!")[\s\S])*?"#|^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F_]+\b|^\b0b[01_]+\b|^\b\d[\d_]*(?:\.[\d_]+)?\b/ },
  { type: "keyword", regex: /^\b(fn|let|mut|use|mod|pub|struct|enum|impl|trait|match|if|else|loop|while|for|in|return|break|continue|const|static|type|as|crate|self|Self|super|where|unsafe|extern|dyn|async|await|ref|move|true|false)\b/ },
  { type: "type", regex: /^\b([A-Z][a-zA-Z0-9_]*|u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64|bool|char|str|String|Option|Result|Vec|Box|Rc|Arc|Cell|RefCell)\b/ },
  { type: "decorator", regex: /^#\[[\s\S]*?\]/ },
  { type: "macro", regex: /^\b([a-zA-Z_][a-zA-Z0-9_]*!)/ },
  BASIC_FUNCTION_RULE,
  RUST_OPERATOR_RULE,
  ...tokenTailRules(),
];

const pythonRules: Rule[] = [
  { type: "comment", regex: /^#.*/ },
  { type: "string", regex: /^[fFrRbBuU]?["']{3}[\s\S]*?["']{3}|^[fFrRbBuU]?"(?:[^"\\]|\\.)*"|^[fFrRbBuU]?'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F_]+\b|^\b0b[01_]+\b|^\b\d[\d_]*(?:\.[\d_]+)?\b/ },
  { type: "keyword", regex: /^\b(def|class|import|from|as|if|elif|else|for|while|try|except|finally|with|assert|return|yield|break|continue|pass|raise|in|is|not|and|or|lambda|global|nonlocal|del|True|False|None|async|await)\b/ },
  { type: "builtin", regex: /^\b(print|len|range|str|int|float|bool|list|dict|set|tuple|enumerate|zip|open|self|cls)\b/ },
  BASIC_TYPE_RULE,
  { type: "decorator", regex: /^@[a-zA-Z0-9_.]+/ },
  BASIC_FUNCTION_RULE,
  PYTHON_OPERATOR_RULE,
  ...tokenTailRules(),
];

const goRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^`[^`]*`|^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F_]+\b|^\b\d+(?:\.\d+)?\b/ },
  { type: "keyword", regex: /^\b(break|default|func|interface|select|case|defer|go|map|struct|chan|else|goto|package|switch|const|fallthrough|if|range|type|continue|for|import|return|var)\b/ },
  { type: "builtin", regex: /^\b(string|int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|float32|float64|complex64|complex128|bool|byte|rune|error|make|new|len|cap|append|copy|delete|panic|recover|print|println)\b/ },
  BASIC_TYPE_RULE,
  BASIC_FUNCTION_RULE,
  GO_OPERATOR_RULE,
  ...tokenTailRules(),
];

const csharpRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^@"(?:[^"]|"")*"|^"(?:[^"\\]|\\.)*"/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F_]+\b|^\b\d[\d_]*(?:\.\d+)?[dfm]?/i },
  { type: "keyword", regex: /^\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|record|ref|return|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|global|file|required|partial|where|get|set|init|add|remove|value|var|when|with|and|or|not|nint|nuint)\b/ },
  BASIC_TYPE_RULE,
  { type: "decorator", regex: /^\[[\s\S]*?\]/ },
  BASIC_FUNCTION_RULE,
  STANDARD_OPERATOR_RULE,
  ...tokenTailRules(),
];

const cppRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F]+\b|^\b\d+(?:\.\d+)?(?:[uUlLfF]+)?\b/ },
  { type: "keyword", regex: /^\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char8_t|char16_t|char32_t|class|compl|concept|const|consteval|constexpr|constinit|const_cast|continue|co_await|co_return|co_yield|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq)\b/ },
  { type: "type", regex: /^\b([A-Z][a-zA-Z0-9_]*|size_t|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|std|string|vector|map|set|optional|variant|unique_ptr|shared_ptr|weak_ptr)\b/ },
  { type: "decorator", regex: /^#\s*(include|define|ifdef|ifndef|endif|pragma|if|elif|else|undef)\b/ },
  CPP_FUNCTION_RULE,
  CPP_OPERATOR_RULE,
  ...tokenTailRules(),
];

const cssRules: Rule[] = [
  { type: "comment", regex: /^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
  { type: "keyword", regex: /^@(?:import|layer|media|supports|keyframes|font-face)\b|^\b(?:important|from|to|and|or|not|only)\b/ },
  { type: "selector", regex: /^[.#][a-zA-Z0-9_-]+|^::?[a-zA-Z-]+/ },
  { type: "number", regex: /^\b\d+(?:\.\d+)?(?:px|em|rem|vh|vw|%|deg|ms|s)?\b/ },
  { type: "builtin", regex: /^\b(var|calc|rgb|rgba|hsl|hsla|url|linear-gradient|radial-gradient)\b/ },
  { type: "operator", regex: /^[:;,>+~]/ },
  { type: "punctuation", regex: /^[{}()[\].]/ },
  { type: "text", regex: /^[a-zA-Z0-9_-]+/ },
  { type: "text", regex: /^[^\s"'`{}()[\].,;:>+~#]+/ },
  { type: "whitespace", regex: /^\s+/ },
];

const defaultRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\/|^#.*/ },
  { type: "string", regex: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b\d+(?:\.\d+)?\b/ },
  { type: "keyword", regex: /^\b(class|const|let|var|function|def|fn|func|import|export|return|if|else|for|while)\b/ },
  { type: "operator", regex: /^[+\-*/%&|^!~=<>?:=]+/ },
  ...tokenTailRules(),
];

export function getRulesForFile(filepath: string): Rule[] {
  const ext = filepath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return jsRules;
    case "rs":
      return rustRules;
    case "cs":
      return csharpRules;
    case "prefab":
      return defaultRules;
    case "css":
      return cssRules;
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
    case "hxx":
      return cppRules;
    case "py":
      return pythonRules;
    case "go":
      return goRules;
    default:
      return defaultRules;
  }
}
