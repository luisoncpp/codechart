import { describe, expect, it } from "vitest";
import capability from "../src-tauri/capabilities/default.json";

describe("Tauri opener capability", () => {
  it("allows module files to be opened with the configured editor", () => {
    expect(capability.permissions).toContainEqual({
      identifier: "opener:allow-open-path",
      allow: [{ path: "**/*", app: true }],
    });
  });
});
