import { describe, expect, it } from "vitest";
import { wikiLinkFromEvent } from "../src/features/graph_canvas/Private/wiki_links/wiki-link-dom";

function mount(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

describe("wikiLinkFromEvent", () => {
  it("reads a code row's link span (both attributes on the span)", () => {
    const host = mount(
      '<span class="hl-wiki-link" data-wiki-target="docs/x.md" data-wiki-from="src/a.ts">[[docs/x.md]]</span>',
    );
    expect(wikiLinkFromEvent(host.firstElementChild)).toEqual({
      target: "docs/x.md",
      fromPath: "src/a.ts",
    });
  });

  it("reads a rendered-markdown anchor through its data-wiki-from wrapper", () => {
    const host = mount(
      '<div class="group-markdown-body" data-wiki-from="docs/a.md">' +
        '<p><a class="hl-wiki-link" data-wiki-target="./b.md">b</a></p></div>',
    );
    const anchor = host.querySelector("a")!;
    expect(wikiLinkFromEvent(anchor)).toEqual({ target: "./b.md", fromPath: "docs/a.md" });
  });

  it("resolves from a nested node inside the link (a find-match span)", () => {
    const host = mount(
      '<span class="hl-wiki-link" data-wiki-target="docs/x.md" data-wiki-from="src/a.ts">' +
        '<span class="hl-match">docs</span></span>',
    );
    expect(wikiLinkFromEvent(host.querySelector(".hl-match"))?.target).toBe("docs/x.md");
  });

  it("ignores clicks that are not on a link", () => {
    const host = mount('<span class="hl-comment">// plain</span>');
    expect(wikiLinkFromEvent(host.firstElementChild)).toBeNull();
    expect(wikiLinkFromEvent(null)).toBeNull();
  });
});
