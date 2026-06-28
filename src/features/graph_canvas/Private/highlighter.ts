// @Architecture(descriptionShort="Lightweight token-based syntax highlighter for multiple languages")

export interface Token {
  type: string;
  text: string;
}

export interface Rule {
  type: string;
  regex: RegExp;
}

const jsRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'|^`(?:[^`\\]|\\.)*`/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F]+\b|^\b0b[01]+\b|^\b\d+(?:\.\d+)?\b/ },
  { type: "keyword", regex: /^\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|as|implements|interface|let|package|private|protected|public|static|any|boolean|constructor|declare|get|module|require|number|readonly|set|string|symbol|type|from|of|async|await)\b/ },
  { type: "builtin", regex: /^\b(console|window|document|process|global|Map|Set|Promise|Error|Object|Array|Function)\b/ },
  { type: "type", regex: /^\b([A-Z][a-zA-Z0-9_]*)\b/ },
  { type: "function", regex: /^\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/ },
  { type: "operator", regex: /^(===|==|!==|!=|=>|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/ },
  { type: "punctuation", regex: /^[{}()[\].,;]/ },
  { type: "decorator", regex: /^@[a-zA-Z0-9_]+/ },
  { type: "text", regex: /^[a-zA-Z0-9_]+/ },
  { type: "text", regex: /^[^\s"'`\w+\-*/%&|^!~=<>?:{}()[\].,;]+/ },
  { type: "whitespace", regex: /^\s+/ },
];

const rustRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^r#"(?:(?!")[\s\S])*?"#|^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F_]+\b|^\b0b[01_]+\b|^\b\d[\d_]*(?:\.[\d_]+)?\b/ },
  { type: "keyword", regex: /^\b(fn|let|mut|use|mod|pub|struct|enum|impl|trait|match|if|else|loop|while|for|in|return|break|continue|const|static|type|as|crate|self|Self|super|where|unsafe|extern|dyn|async|await|ref|move|true|false)\b/ },
  { type: "type", regex: /^\b([A-Z][a-zA-Z0-9_]*|u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64|bool|char|str|String|Option|Result|Vec|Box|Rc|Arc|Cell|RefCell)\b/ },
  { type: "decorator", regex: /^#\[[\s\S]*?\]/ },
  { type: "macro", regex: /^\b([a-zA-Z_][a-zA-Z0-9_]*!)/ },
  { type: "function", regex: /^\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/ },
  { type: "operator", regex: /^(===|==|!==|!=|=>|->|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/ },
  { type: "punctuation", regex: /^[{}()[\].,;]/ },
  { type: "text", regex: /^[a-zA-Z0-9_]+/ },
  { type: "text", regex: /^[^\s"'`\w+\-*/%&|^!~=<>?:{}()[\].,;]+/ },
  { type: "whitespace", regex: /^\s+/ },
];

const pythonRules: Rule[] = [
  { type: "comment", regex: /^#.*/ },
  { type: "string", regex: /^[fFrRbBuU]?["']{3}[\s\S]*?["']{3}|^[fFrRbBuU]?"(?:[^"\\]|\\.)*"|^[fFrRbBuU]?'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F_]+\b|^\b0b[01_]+\b|^\b\d[\d_]*(?:\.[\d_]+)?\b/ },
  { type: "keyword", regex: /^\b(def|class|import|from|as|if|elif|else|for|while|try|except|finally|with|assert|return|yield|break|continue|pass|raise|in|is|not|and|or|lambda|global|nonlocal|del|True|False|None|async|await)\b/ },
  { type: "builtin", regex: /^\b(print|len|range|str|int|float|bool|list|dict|set|tuple|enumerate|zip|open|self|cls)\b/ },
  { type: "type", regex: /^\b([A-Z][a-zA-Z0-9_]*)\b/ },
  { type: "decorator", regex: /^@[a-zA-Z0-9_.]+/ },
  { type: "function", regex: /^\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/ },
  { type: "operator", regex: /^(\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/ },
  { type: "punctuation", regex: /^[{}()[\].,;]/ },
  { type: "text", regex: /^[a-zA-Z0-9_]+/ },
  { type: "text", regex: /^[^\s"'`\w+\-*/%&|^!~=<>?:{}()[\].,;]+/ },
  { type: "whitespace", regex: /^\s+/ },
];

const goRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^`[^`]*`|^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F_]+\b|^\b\d+(?:\.\d+)?\b/ },
  { type: "keyword", regex: /^\b(break|default|func|interface|select|case|defer|go|map|struct|chan|else|goto|package|switch|const|fallthrough|if|range|type|continue|for|import|return|var)\b/ },
  { type: "builtin", regex: /^\b(string|int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|float32|float64|complex64|complex128|bool|byte|rune|error|make|new|len|cap|append|copy|delete|panic|recover|print|println)\b/ },
  { type: "type", regex: /^\b([A-Z][a-zA-Z0-9_]*)\b/ },
  { type: "function", regex: /^\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/ },
  { type: "operator", regex: /^(:=|=>|->|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/ },
  { type: "punctuation", regex: /^[{}()[\].,;]/ },
  { type: "text", regex: /^[a-zA-Z0-9_]+/ },
  { type: "text", regex: /^[^\s"'`\w+\-*/%&|^!~=<>?:{}()[\].,;]+/ },
  { type: "whitespace", regex: /^\s+/ },
];

const csharpRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\// },
  { type: "string", regex: /^@"(?:[^"]|"")*"|^"(?:[^"\\]|\\.)*"/ },
  { type: "number", regex: /^\b0x[0-9a-fA-F_]+\b|^\b\d[\d_]*(?:\.\d+)?[dfm]?/i },
  { type: "keyword", regex: /^\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|record|ref|return|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|global|file|required|partial|where|get|set|init|add|remove|value|var|when|with|and|or|not|nint|nuint)\b/ },
  { type: "type", regex: /^\b([A-Z][a-zA-Z0-9_]*)\b/ },
  { type: "decorator", regex: /^\[[\s\S]*?\]/ },
  { type: "function", regex: /^\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/ },
  { type: "operator", regex: /^(===|==|!==|!=|=>|\+\+|--|\+=|-=|\*=|\/=|&&|\|\||[+\-*/%&|^!~=<>?:])/ },
  { type: "punctuation", regex: /^[{}()[\].,;]/ },
  { type: "text", regex: /^[a-zA-Z0-9_]+/ },
  { type: "text", regex: /^[^\s"'`\w+\-*/%&|^!~=<>?:{}()[\].,;]+/ },
  { type: "whitespace", regex: /^\s+/ },
];

const defaultRules: Rule[] = [
  { type: "comment", regex: /^\/\/.*|^\/\*[\s\S]*?\*\/|^#.*/ },
  { type: "string", regex: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'/ },
  { type: "number", regex: /^\b\d+(?:\.\d+)?\b/ },
  { type: "keyword", regex: /^\b(class|const|let|var|function|def|fn|func|import|export|return|if|else|for|while)\b/ },
  { type: "operator", regex: /^[+\-*/%&|^!~=<>?:=]+/ },
  { type: "punctuation", regex: /^[{}()[\].,;]/ },
  { type: "text", regex: /^[a-zA-Z0-9_]+/ },
  { type: "text", regex: /^[^\s"'`\w+\-*/%&|^!~=<>?:{}()[\].,;]+/ },
  { type: "whitespace", regex: /^\s+/ },
];

function getRulesForFile(filepath: string): Rule[] {
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
    case "py":
      return pythonRules;
    case "go":
      return goRules;
    default:
      return defaultRules;
  }
}

/**
 * Tokenizes code based on language derived from file path extension.
 * Returns an array of lines, where each line is an array of Token objects.
 */
export function tokenizeCode(code: string, filepath: string): Token[][] {
  const rules = getRulesForFile(filepath);
  const tokens: Token[] = [];
  let remaining = code;

  const maxIterations = code.length * 2 + 100;
  let iterations = 0;

  while (remaining.length > 0 && iterations < maxIterations) {
    iterations++;
    let matched = false;
    for (const rule of rules) {
      const match = remaining.match(rule.regex);
      if (match) {
        tokens.push({ type: rule.type, text: match[0] });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: "text", text: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  // Split tokens by newlines
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        lines.push([]);
      }
      if (parts[i].length > 0) {
        lines[lines.length - 1].push({ type: token.type, text: parts[i] });
      }
    }
  }

  return lines;
}
