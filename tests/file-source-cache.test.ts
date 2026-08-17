import { describe, expect, it, vi } from "vitest";
import { FileSourceCache } from "../src/state/graph-session/Private/file-source-cache";

describe("FileSourceCache", () => {
  it("reads a file once and serves the cached body after that", async () => {
    const read = vi.fn(async () => "# Doc");
    const cache = new FileSourceCache(read);
    expect(await cache.get("docs/x.md")).toBe("# Doc");
    expect(await cache.get("docs/x.md")).toBe("# Doc");
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("caches a failure as null so a broken link stops hitting IPC", async () => {
    const read = vi.fn(async () => {
      throw new Error("io error");
    });
    const cache = new FileSourceCache(read);
    expect(await cache.get("nope.md")).toBeNull();
    expect(await cache.get("nope.md")).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("re-reads after a clear (a new project loaded)", async () => {
    const read = vi.fn(async () => "body");
    const cache = new FileSourceCache(read);
    await cache.get("docs/x.md");
    cache.clear();
    await cache.get("docs/x.md");
    expect(read).toHaveBeenCalledTimes(2);
  });
});
