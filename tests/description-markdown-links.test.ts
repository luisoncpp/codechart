import { describe, expect, it } from "vitest";
import {
  renderBlockMarkdown,
  renderInlineMarkdown,
} from "../src/features/graph_canvas/Private/descriptions/render-markdown";
import { wikiLinkFromEvent } from "../src/features/graph_canvas/Private/wiki_links";

function anchorIn(html: string): HTMLAnchorElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.querySelector("a")!;
}

// Regression: a plain `<a href="docs/x.md">` in a group description navigated
// the whole webview to that URL, which reloaded the app instead of previewing.
describe("markdown links in group descriptions", () => {
  it("renders a relative link as a wiki link with no href", () => {
    const link = anchorIn(renderInlineMarkdown("See [the flow](docs/flows/x.md)."));
    expect(link.hasAttribute("href")).toBe(false);
    expect(link.textContent).toBe("the flow");
    expect(wikiLinkFromEvent(link)?.target).toBe("docs/flows/x.md");
  });

  it("keeps a #section fragment and decodes escaped spaces", () => {
    const link = anchorIn(renderBlockMarkdown("[x](docs/my%20doc.md#Open-project)"));
    expect(wikiLinkFromEvent(link)?.target).toBe("docs/my doc.md#Open-project");
  });

  it("leaves external URLs as ordinary links", () => {
    const link = anchorIn(renderInlineMarkdown("[site](https://example.com)"));
    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.hasAttribute("data-wiki-target")).toBe(false);
  });
});
