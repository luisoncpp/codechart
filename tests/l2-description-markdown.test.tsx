/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { L2Description } from "../src/features/graph_canvas/Private/l2/L2Content";

describe("L2Description Markdown support", () => {
  it("renders markdown formatting when no matchRanges are provided", () => {
    const description = "Module for **rendering** `Markdown` with [link](https://example.com).";
    const { container } = render(
      <L2Description
        description={description}
        color="#2563eb"
        zoom={1}
      />,
    );

    const strong = container.querySelector(".l2-desc-markdown strong");
    expect(strong).not.toBeNull();
    expect(strong).toHaveTextContent("rendering");

    const code = container.querySelector(".l2-desc-markdown code");
    expect(code).not.toBeNull();
    expect(code).toHaveTextContent("Markdown");

    const link = container.querySelector('.l2-desc-markdown a[href="https://example.com"]');
    expect(link).not.toBeNull();
    expect(link).toHaveTextContent("link");
  });

  it("renders fallback message when no description is provided", () => {
    const { container } = render(
      <L2Description
        color="#2563eb"
        zoom={1}
      />,
    );

    expect(container).toHaveTextContent("No description provided for this module.");
  });

  it("preserves matchRanges highlighting when search matches are active", () => {
    const description = "Primary state store";
    const { container } = render(
      <L2Description
        description={description}
        color="#2563eb"
        zoom={1}
        matchRanges={[{ startCol: 8, endCol: 13, active: true }]}
      />,
    );

    const matchSpan = container.querySelector(".hl-match--active");
    expect(matchSpan).not.toBeNull();
    expect(matchSpan).toHaveTextContent("state");
  });
});
