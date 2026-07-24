/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SettingsMenu } from "../../src/features/project_settings";
import {
  defaultProjectConfig,
  type ProjectConfig,
} from "../../src/ipc/project-config-client";

function renderSettings(config: ProjectConfig, hasCppModules = false) {
  const readProjectConfig = vi.fn(async () => config);
  const writeProjectConfig = vi.fn(async () => {});
  const onEditorSaved = vi.fn();
  const onCppConfigSaved = vi.fn();
  render(
    <SettingsMenu
      root="/my/project"
      editor={config.editor}
      hasCppModules={hasCppModules}
      client={{ readProjectConfig, writeProjectConfig }}
      onEditorSaved={onEditorSaved}
      onCppConfigSaved={onCppConfigSaved}
    />,
  );
  return {
    readProjectConfig,
    writeProjectConfig,
    onEditorSaved,
    onCppConfigSaved,
  };
}

function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
}

describe("flow: project settings", () => {
  it("saves the editor per project without replacing C++ settings", async () => {
    const config = {
      ...defaultProjectConfig(),
      unreal: {
        ...defaultProjectConfig().unreal,
        knownPaths: ["Source/Game/Public"],
      },
    };
    const spies = renderSettings(config);
    openSettings();
    expect(
      screen.queryByRole("menuitem", { name: "C++ include paths..." }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Editor..." }));
    fireEvent.change(screen.getByRole("textbox", { name: "Editor executable" }), {
      target: { value: "code-insiders" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(spies.writeProjectConfig).toHaveBeenCalledWith(
      "/my/project",
      { ...config, editor: "code-insiders" },
    ));
    expect(spies.onEditorSaved).toHaveBeenCalledWith("code-insiders");
  });

  it("opens C++ paths from Settings and preserves the editor", async () => {
    const config = { ...defaultProjectConfig(), editor: "zed" };
    const spies = renderSettings(config, /*hasCppModules=*/true);
    openSettings();
    fireEvent.click(
      screen.getByRole("menuitem", { name: "C++ include paths..." }),
    );
    await waitFor(() =>
      expect(spies.readProjectConfig).toHaveBeenCalledWith("/my/project"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add include path" }));
    fireEvent.change(screen.getByPlaceholderText("path/to/include"), {
      target: { value: "Source/Game/Public" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and reload" }));

    await waitFor(() => expect(spies.writeProjectConfig).toHaveBeenCalledWith(
      "/my/project",
      {
        editor: "zed",
        unreal: {
          ...config.unreal,
          knownPaths: ["Source/Game/Public"],
        },
      },
    ));
    expect(spies.onCppConfigSaved).toHaveBeenCalledOnce();
  });
});
