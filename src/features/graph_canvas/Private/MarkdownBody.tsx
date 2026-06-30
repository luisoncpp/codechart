import { marked } from "marked";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO =
  'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace';

/** Target on-screen px; divided by canvas zoom inside the node. */
const sx = (screenPx: number, zoom: number) => `${screenPx / zoom}px`;

/** Strip a leading YAML frontmatter fence when present (architecture docs). */
export function stripMarkdownFrontmatter(source: string): string {
  if (!source.startsWith("---")) return source;
  const end = source.indexOf("\n---", 4);
  if (end === -1) return source;
  return source.slice(end + 4).replace(/^\s+/, "");
}

interface MarkdownBodyProps {
  source: string;
  zoom: number;
}

/** Render trusted project markdown as HTML inside the L2 scroll region. */
export function MarkdownBody({ source, zoom }: MarkdownBodyProps) {
  const body = stripMarkdownFrontmatter(source);
  const html = marked.parse(body, { async: false }) as string;

  return (
    <div
      className="group-markdown-body"
      style={{
        width: "100%",
        fontFamily: SANS,
        fontSize: sx(14, zoom),
        lineHeight: 1.5,
        color: "#334155",
        textAlign: "left",
        wordBreak: "break-word",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function markdownBodyStyles(accentColor: string, zoom: number): string {
  const gap = (n: number) => sx(n * 4 + 8, zoom);
  const codeSize = sx(12, zoom);
  return `
    .group-markdown-body {
      text-align: left;
    }
    .group-markdown-body h1, .group-markdown-body h2, .group-markdown-body h3 {
      color: #0f172a;
      font-weight: 700;
      margin: ${gap(2)} 0 ${gap(1)} 0;
      line-height: 1.25;
    }
    .group-markdown-body h1 { font-size: ${sx(22, zoom)}; }
    .group-markdown-body h2 {
      font-size: ${sx(18, zoom)};
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: ${sx(4, zoom)};
    }
    .group-markdown-body h3 { font-size: ${sx(16, zoom)}; }
    .group-markdown-body p { margin: 0 0 ${sx(8, zoom)} 0; }
    .group-markdown-body ul, .group-markdown-body ol {
      margin: 0 0 ${sx(8, zoom)} 0;
      padding-left: 1.35em;
      list-style-position: outside;
    }
    .group-markdown-body ul { list-style-type: disc; }
    .group-markdown-body ol { list-style-type: decimal; }
    .group-markdown-body li {
      display: list-item;
      margin-bottom: 0.35em;
    }
    .group-markdown-body li > p {
      margin: 0;
    }
    .group-markdown-body li > p + p {
      margin-top: 0.35em;
    }
    .group-markdown-body code {
      font-family: ${MONO};
      font-size: ${codeSize};
      background: #f1f5f9;
      padding: ${sx(1, zoom)} ${sx(4, zoom)};
      border-radius: ${sx(3, zoom)};
    }
    .group-markdown-body pre {
      margin: 0 0 ${sx(8, zoom)} 0;
      padding: ${sx(8, zoom)};
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: ${sx(3, zoom)} solid ${accentColor};
      border-radius: ${sx(4, zoom)};
      overflow-x: auto;
      text-align: left;
    }
    .group-markdown-body pre code {
      background: transparent;
      padding: 0;
      font-size: ${codeSize};
    }
    .group-markdown-body a { color: ${accentColor}; text-decoration: none; }
    .group-markdown-body a:hover { text-decoration: underline; }
    .group-markdown-body table {
      border-collapse: collapse;
      margin: 0 0 ${sx(8, zoom)} 0;
      font-size: ${codeSize};
    }
    .group-markdown-body th, .group-markdown-body td {
      border: 1px solid #e2e8f0;
      padding: ${sx(4, zoom)} ${sx(6, zoom)};
      text-align: left;
    }
    .group-markdown-body th { background: #f8fafc; font-weight: 600; }
    .group-markdown-body blockquote {
      margin: 0 0 ${sx(8, zoom)} 0;
      padding-left: ${sx(10, zoom)};
      border-left: ${sx(3, zoom)} solid ${accentColor};
      color: #64748b;
    }
  `;
}
