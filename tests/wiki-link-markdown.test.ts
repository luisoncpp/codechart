import { describe, expect, it } from "vitest";
import { Marked } from "marked";
import { normalizeSectionKey, wikiLinkExtension } from "../src/features/graph_canvas/Private/wiki_links";

const markdown = new Marked({ async: false })
  .use({ extensions: [wikiLinkExtension] })
  .use({
    renderer: {
      heading({ tokens, depth, text }) {
        const inner = this.parser.parseInline(tokens);
        return `<h${depth} id="${normalizeSectionKey(text)}">${inner}</h${depth}>\n`;
      },
    },
  });

function render(source: string): string {
  return markdown.parse(source, { async: false }) as string;
}

describe("wikiLinkExtension", () => {
  it("turns a link into an anchor carrying its target", () => {
    const html = render("See [[docs/flows/x.md]].");
    expect(html).toContain('data-wiki-target="docs/flows/x.md"');
    expect(html).toContain('class="hl-wiki-link"');
    expect(html).toContain(">docs/flows/x.md<");
  });

  it("shows the pipe label as the anchor text", () => {
    const html = render("See [[docs/x.md|the flow]].");
    expect(html).toContain('data-wiki-target="docs/x.md"');
    expect(html).toContain(">the flow<");
  });

  it("escapes markup inside a target", () => {
    const html = render('[[a"><script>.md]]');
    expect(html).not.toContain("<script>");
  });

  it("leaves links inside fenced code alone", () => {
    const html = render("```\n[[docs/x.md]]\n```");
    expect(html).not.toContain("data-wiki-target");
  });

  it("does not affect ordinary markdown links", () => {
    const html = render("[label](docs/x.md)");
    expect(html).toContain('href="docs/x.md"');
    expect(html).not.toContain("data-wiki-target");
  });

  it("adds normalized ids to ATX headings", () => {
    const html = render("## Open project\n\nBody.");
    expect(html).toContain('id="open-project"');
  });
});
