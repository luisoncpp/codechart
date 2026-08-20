// @Architecture(descriptionShort="Displays file path, group name, and architecture annotations with Markdown support")
import { Marked } from "marked";
import type { Annotation, GroupNode, ModuleNode } from "../../../domain/graph";

const markdown = new Marked({ async: false });
const inlineCache = new Map<string, string>();
const blockCache = new Map<string, string>();

function parseInspectorInline(source: string): string {
  const cached = inlineCache.get(source);
  if (cached !== undefined) return cached;
  const rendered = markdown.parseInline(source, { async: /*isAsync=*/false }) as string;
  if (inlineCache.size >= 500) inlineCache.clear();
  inlineCache.set(source, rendered);
  return rendered;
}

function parseInspectorBlock(source: string): string {
  const cached = blockCache.get(source);
  if (cached !== undefined) return cached;
  const rendered = markdown.parse(source, { async: /*isAsync=*/false }) as string;
  if (blockCache.size >= 500) blockCache.clear();
  blockCache.set(source, rendered);
  return rendered;
}

interface MetadataSectionProps {
  module?: ModuleNode;
  group?: GroupNode;
}

/** Render the `@Architecture` annotations for a module and/or group. Renders
 *  nothing when neither carries an annotation. */
export function MetadataSection({ module, group }: MetadataSectionProps) {
  const hasModule = !!module?.annotation;
  const hasGroup = !!group?.annotation;
  if (!hasModule && !hasGroup) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <style>{metadataMarkdownStyles}</style>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Architecture</h3>
      {hasModule && <Block title={typeLabel(module!.annotation!)} note={module!.annotation!} />}
      {hasGroup && <Block title={`Group · ${group!.label}`} note={group!.annotation!} />}
    </div>
  );
}

function typeLabel(a: Annotation): string {
  return a.type ? `This module · ${a.type}` : "This module";
}

function Block({ title, note }: { title: string; note: Annotation }) {
  const shortHtml = note.descriptionShort
    ? parseInspectorInline(note.descriptionShort)
    : undefined;
  const longHtml = note.descriptionLong
    ? parseInspectorBlock(note.descriptionLong)
    : undefined;

  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 2px", color: "#475569" }}>
        {title}
      </p>
      {shortHtml && (
        <div
          className="metadata-desc-short"
          style={{ fontSize: 12, margin: 0 }}
          dangerouslySetInnerHTML={{ __html: shortHtml }}
        />
      )}
      {longHtml && (
        <div
          className="metadata-desc-long"
          style={{ fontSize: 11, margin: "2px 0 0", color: "#64748b" }}
          dangerouslySetInnerHTML={{ __html: longHtml }}
        />
      )}
    </div>
  );
}

const metadataMarkdownStyles = `
  .metadata-desc-short, .metadata-desc-long {
    line-height: 1.45;
    word-break: break-word;
  }
  .metadata-desc-long p {
    margin: 0 0 4px 0;
  }
  .metadata-desc-long p:last-child {
    margin: 0;
  }
  .metadata-desc-short code, .metadata-desc-long code {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, monospace;
    font-size: 11px;
    background: #f1f5f9;
    padding: 1px 3px;
    border-radius: 3px;
    color: #0f172a;
  }
  .metadata-desc-short a, .metadata-desc-long a {
    color: #2563eb;
    text-decoration: none;
  }
  .metadata-desc-short a:hover, .metadata-desc-long a:hover {
    text-decoration: underline;
  }
  .metadata-desc-long ul, .metadata-desc-long ol {
    margin: 0 0 4px 0;
    padding-left: 16px;
  }
  .metadata-desc-long li {
    margin-bottom: 2px;
  }
  .metadata-desc-long pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 4px 6px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0 0 4px 0;
    font-size: 11px;
  }
  .metadata-desc-long pre code {
    background: transparent;
    padding: 0;
  }
`;

