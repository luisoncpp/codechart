/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { createMockDevtoolsClient } from "../src/ipc/devtools-client";
import { useDevtoolsShortcut } from "../src/app/Private/use-devtools-shortcut";

function ShortcutListener({ client }: { client: ReturnType<typeof createMockDevtoolsClient> }) {
  useDevtoolsShortcut(client);
  return <div data-testid="listener" />;
}

describe("devtools shortcut", () => {
  it("toggles devtools on Ctrl+Shift+I", () => {
    const onToggle = vi.fn();
    const client = createMockDevtoolsClient(onToggle);
    render(<ShortcutListener client={client} />);

    fireEvent.keyDown(window, {
      key: "I",
      ctrlKey: true,
      shiftKey: true,
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("toggles devtools on Cmd+Shift+I (macOS)", () => {
    const onToggle = vi.fn();
    const client = createMockDevtoolsClient(onToggle);
    render(<ShortcutListener client={client} />);

    fireEvent.keyDown(window, {
      key: "i",
      metaKey: true,
      shiftKey: true,
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("toggles devtools on F12", () => {
    const onToggle = vi.fn();
    const client = createMockDevtoolsClient(onToggle);
    render(<ShortcutListener client={client} />);

    fireEvent.keyDown(window, {
      key: "F12",
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not toggle devtools on unrelated key combinations", () => {
    const onToggle = vi.fn();
    const client = createMockDevtoolsClient(onToggle);
    render(<ShortcutListener client={client} />);

    fireEvent.keyDown(window, { key: "i", ctrlKey: true });
    fireEvent.keyDown(window, { key: "i", shiftKey: true });
    fireEvent.keyDown(window, { key: "f", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: "F11" });

    expect(onToggle).not.toHaveBeenCalled();
  });

  it("removes the keydown listener on unmount", () => {
    const onToggle = vi.fn();
    const client = createMockDevtoolsClient(onToggle);
    const { unmount } = render(<ShortcutListener client={client} />);

    unmount();

    fireEvent.keyDown(window, {
      key: "I",
      ctrlKey: true,
      shiftKey: true,
    });

    expect(onToggle).not.toHaveBeenCalled();
  });
});
