/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MetadataSection } from "../src/features/inspection_panel/Private/MetadataSection";
import type { GroupNode, ModuleNode } from "../src/domain/graph";

describe("MetadataSection Markdown support", () => {
  it("renders inline markdown for module descriptionShort and block markdown for descriptionLong", () => {
    const module: ModuleNode = {
      id: "src/store.ts",
      label: "store.ts",
      path: "src/store.ts",
      groupId: "core",
      isFacade: false,
      language: "typescript",
      metrics: { loc: 100, commits: 1, churn: 10, authors: 1, maxChurn: 10, activityRank: 1, riskRank: 1 },
      exportedSymbols: [],
      annotation: {
        type: "State",
        descriptionShort: "The **primary** store with `createStore` helper",
        descriptionLong: "Detailed explanation:\n- Feature 1\n- Feature 2\n\nVisit [docs](https://example.com).",
      },
    };

    const { container } = render(<MetadataSection module={module} />);

    // Bold text rendered in strong tag
    const strong = container.querySelector(".metadata-desc-short strong");
    expect(strong).not.toBeNull();
    expect(strong).toHaveTextContent("primary");

    // Code tag rendered
    const code = container.querySelector(".metadata-desc-short code");
    expect(code).not.toBeNull();
    expect(code).toHaveTextContent("createStore");

    // Lists rendered in long description
    const listItems = container.querySelectorAll(".metadata-desc-long li");
    expect(listItems.length).toBe(2);
    expect(listItems[0]).toHaveTextContent("Feature 1");
    expect(listItems[1]).toHaveTextContent("Feature 2");

    // Link rendered
    const link = container.querySelector('.metadata-desc-long a[href="https://example.com"]');
    expect(link).not.toBeNull();
    expect(link).toHaveTextContent("docs");
  });

  it("renders markdown for group annotations", () => {
    const group: GroupNode = {
      id: "core",
      label: "Core Domain",
      parentId: null,
      facadeModuleIds: [],
      disconnectedByDefault: false,
      disconnectedModuleIds: [],
      annotation: {
        descriptionShort: "Core *domain* logic",
        descriptionLong: "### Core Subsystem\n\nRuns pure business logic in `src/core`.",
      },
    };

    const { container } = render(<MetadataSection group={group} />);

    const em = container.querySelector(".metadata-desc-short em");
    expect(em).not.toBeNull();
    expect(em).toHaveTextContent("domain");

    const heading = container.querySelector(".metadata-desc-long h3");
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent("Core Subsystem");

    const code = container.querySelector(".metadata-desc-long code");
    expect(code).not.toBeNull();
    expect(code).toHaveTextContent("src/core");
  });
});
