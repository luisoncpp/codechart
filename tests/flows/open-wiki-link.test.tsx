/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { createMockAnalysisClient, type AnalysisClient } from "../../src/ipc/analysis-client";
import { testGraphSessionStore } from "../helpers/test-graph-session-store";
import { renderGraphCanvas } from "../helpers/flow-graph-canvas";
import type { GraphSessionStore } from "../../src/state/graph-session";

const LINKED_MODULE = "src/core/store.ts";
const COMMENT = "// see [[README.md]] and [[./validate.ts|the validator]]\n";
const SECTION_COMMENT =
  "// @Section(Validation)\n// see [[./validate.ts#Validation]]\n";

/**
 * The fixture sources are read through the mock client, so the wiki-link
 * comment is injected there instead of edited into the fixture file — a new
 * fixture line would change `metrics.loc` and the golden graph with it.
 */
function clientWithLinkComment(overrides: Partial<AnalysisClient> = {}): AnalysisClient {
  const mock = createMockAnalysisClient();
  return {
    ...mock,
    async readModuleSource(root: string, path: string) {
      const source = await mock.readModuleSource(root, path);
      return path === LINKED_MODULE ? COMMENT + source : source;
    },
    ...overrides,
  };
}

function clientWithSectionLink(overrides: Partial<AnalysisClient> = {}): AnalysisClient {
  const mock = createMockAnalysisClient();
  return {
    ...mock,
    async readModuleSource(root: string, path: string) {
      const source = await mock.readModuleSource(root, path);
      if (path === LINKED_MODULE) return SECTION_COMMENT + source;
      if (path === "src/core/validate.ts") return "// @Section(Validation)\n" + source;
      return source;
    },
    ...overrides,
  };
}

async function readyStore(client: AnalysisClient): Promise<GraphSessionStore> {
  const store = testGraphSessionStore(client);
  await store.loadProject("/sample");
  return store;
}

/** Open the linking module's document frame from its context menu. */
async function openLinkingFrame(store: GraphSessionStore) {
  const { container } = renderGraphCanvas(store);
  const moduleNode = await waitFor(() => {
    const node = container.querySelector(`[data-id="${LINKED_MODULE}"]`);
    expect(node).toBeTruthy();
    return node!;
  });
  fireEvent.contextMenu(moduleNode);
  fireEvent.click(await screen.findByRole("menuitem", { name: "Open file preview" }));
  const link = await waitFor(() => {
    const el = document.querySelector(".hl-wiki-link");
    expect(el).toBeTruthy();
    return el!;
  });
  return { container, link };
}

function frameTitles(): (string | null)[] {
  return [...document.querySelectorAll(".symbol-widget__title")].map((el) => el.textContent);
}

describe("flow: open-wiki-link", () => {
  it("renders a link span per `[[target]]` inside a comment, labelled and addressed", async () => {
    const store = await readyStore(clientWithLinkComment());
    await openLinkingFrame(store);
    const links = [...document.querySelectorAll(".hl-wiki-link")];
    expect(links.map((el) => el.getAttribute("data-wiki-target"))).toEqual([
      "README.md",
      "./validate.ts",
    ]);
    expect(links[1]?.textContent).toBe("[[./validate.ts|the validator]]");
    expect(links[0]?.getAttribute("data-wiki-from")).toBe(LINKED_MODULE);
  });

  it("opens a second frame rendering the markdown destination", async () => {
    const store = await readyStore(clientWithLinkComment());
    const { link } = await openLinkingFrame(store);

    await act(async () => {
      fireEvent.click(link);
    });

    await waitFor(() => {
      expect(document.querySelectorAll(".symbol-widget").length).toBe(2);
      expect(frameTitles()).toContain("README.md");
    });
    const markdownFrame = [...document.querySelectorAll(".symbol-widget")].find((frame) =>
      frame.querySelector(".symbol-widget__markdown"),
    );
    expect(markdownFrame?.querySelector(".group-markdown-body h1")).toBeTruthy();
    // Find cannot highlight inside rendered HTML, so its toggle stays hidden.
    expect(markdownFrame?.querySelector('[aria-label="Find in file"]')).toBeNull();
  });

  it("toggles a markdown frame between rendered prose and raw source", async () => {
    const store = await readyStore(clientWithLinkComment());
    const { link } = await openLinkingFrame(store);
    await act(async () => {
      fireEvent.click(link);
    });
    await waitFor(() => expect(document.querySelector(".symbol-widget__markdown")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Show raw source" }));

    expect(document.querySelector(".symbol-widget__markdown")).toBeNull();
    expect(document.querySelector(".symbol-widget__document")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show rendered markdown" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Find in file" }).length).toBeGreaterThan(0);
  });

  it("resolves a relative target against the linking file's directory", async () => {
    const store = await readyStore(clientWithLinkComment());
    await openLinkingFrame(store);
    const relative = [...document.querySelectorAll(".hl-wiki-link")][1]!;

    await act(async () => {
      fireEvent.click(relative);
    });

    await waitFor(() => {
      const paths = [...document.querySelectorAll(".symbol-widget__path")].map(
        (el) => el.textContent,
      );
      expect(paths).toContain("src/core/validate.ts");
    });
  });

  it("reports an unreadable destination instead of opening an empty frame", async () => {
    const client = clientWithLinkComment({
      readModuleSource: async (root: string, path: string) => {
        if (path === "README.md") throw new Error("io error: missing");
        const source = await createMockAnalysisClient().readModuleSource(root, path);
        return path === LINKED_MODULE ? COMMENT + source : source;
      },
    });
    const store = await readyStore(client);
    const { link } = await openLinkingFrame(store);

    await act(async () => {
      fireEvent.click(link);
    });

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Could not read README.md"),
    );
  });

  it("highlights the @Section line when the link includes a fragment", async () => {
    const store = await readyStore(clientWithSectionLink());
    await openLinkingFrame(store);
    const sectionLink = [...document.querySelectorAll(".hl-wiki-link")].find(
      (el) => el.getAttribute("data-wiki-target") === "./validate.ts#Validation",
    )!;

    await act(async () => {
      fireEvent.click(sectionLink);
    });

    await waitFor(() => {
      expect(document.querySelector(".symbol-widget__line--active")).toBeTruthy();
    });
  });

  it("clicking a link in an L2 canvas document opens a frame without selecting the module", async () => {
    // L2 documents only mount when the clamped-layout hook sees a visible
    // region, and jsdom reports every rect as 0×0 — give it a viewport.
    const restore = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = () =>
      ({ top: 0, left: 0, bottom: 800, right: 800, width: 800, height: 800, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    try {
      const store = await readyStore(clientWithLinkComment());
      const { container } = renderGraphCanvas(store);
      await act(async () => {
        store.setZoomLevel(/*level=*/ 2);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const link = await waitFor(() => {
        const el = container.querySelector(".hl-wiki-link");
        expect(el).toBeTruthy();
        return el!;
      });

      await act(async () => {
        fireEvent.click(link);
      });

      await waitFor(() => expect(document.querySelector(".symbol-widget")).toBeTruthy());
      expect(store.getSelectedId()).toBeNull();
    } finally {
      Element.prototype.getBoundingClientRect = restore;
    }
  });
});
