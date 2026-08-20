// @Architecture(descriptionShort="Rendered HTML view for Help topic Markdown documentation")
import { Marked } from "marked";

const markdown = new Marked({ async: false });

interface HelpMarkdownViewProps {
  source: string;
}

export function HelpMarkdownView({ source }: HelpMarkdownViewProps) {
  const html = markdown.parse(source, { async: false }) as string;

  return (
    <>
      <style>{helpMarkdownStyles}</style>
      <div
        className="help-markdown-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO = 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace';

const helpMarkdownStyles = `
  .help-markdown-content {
    font-family: ${SANS};
    font-size: 14px;
    line-height: 1.6;
    color: #334155;
    text-align: left;
    word-break: break-word;
  }
  .help-markdown-content h1 {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  .help-markdown-content h2 {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin: 20px 0 10px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #f1f5f9;
  }
  .help-markdown-content h3 {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin: 16px 0 8px 0;
  }
  .help-markdown-content p {
    margin: 0 0 12px 0;
  }
  .help-markdown-content ul, .help-markdown-content ol {
    margin: 0 0 12px 0;
    padding-left: 20px;
  }
  .help-markdown-content li {
    margin-bottom: 4px;
  }
  .help-markdown-content li > p {
    margin: 0;
  }
  .help-markdown-content code {
    font-family: ${MONO};
    font-size: 12px;
    background: #f1f5f9;
    padding: 2px 5px;
    border-radius: 4px;
    color: #0f172a;
  }
  .help-markdown-content pre {
    margin: 0 0 14px 0;
    padding: 12px;
    background: #0f172a;
    color: #f8fafc;
    border-radius: 6px;
    overflow-x: auto;
    font-family: ${MONO};
    font-size: 12px;
    line-height: 1.45;
  }
  .help-markdown-content pre code {
    background: transparent;
    color: inherit;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
  }
  .help-markdown-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0 0 16px 0;
    font-size: 13px;
  }
  .help-markdown-content th, .help-markdown-content td {
    border: 1px solid #e2e8f0;
    padding: 6px 10px;
    text-align: left;
  }
  .help-markdown-content th {
    background: #f8fafc;
    font-weight: 600;
    color: #1e293b;
  }
  .help-markdown-content tr:nth-child(even) {
    background: #fdfdfd;
  }
  .help-markdown-content blockquote {
    margin: 0 0 12px 0;
    padding-left: 12px;
    border-left: 3px solid #3b82f6;
    color: #64748b;
  }
  .help-markdown-content a {
    color: #2563eb;
    text-decoration: none;
  }
  .help-markdown-content a:hover {
    text-decoration: underline;
  }
`;
