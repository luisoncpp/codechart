// @Architecture(descriptionShort="Caches arbitrary project-file reads, failures included")

type Reader = (path: string) => Promise<string>;

/**
 * Reads project files that are not graph modules (docs a wiki-link points at).
 * Failures are cached as `null` so a broken link does not hit IPC on every
 * click — the mock analysis client never throws, so a missing file surfaces as
 * a placeholder body there rather than as `null`.
 */
export class FileSourceCache {
  private entries = new Map<string, string | null>();

  constructor(private read: Reader) {}

  async get(path: string): Promise<string | null> {
    const cached = this.entries.get(path);
    if (cached !== undefined) return cached;
    try {
      const source = await this.read(path);
      this.entries.set(path, source);
      return source;
    } catch {
      this.entries.set(path, null);
      return null;
    }
  }

  clear() {
    this.entries = new Map();
  }
}
