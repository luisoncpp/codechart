// Keeps src-tauri/target small. Cargo never deletes old build outputs, so every
// dependency or profile change leaves a second copy behind.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const SRC_TAURI = fileURLToPath(new URL("../src-tauri/", import.meta.url));
const RELEASE_DIR = join(SRC_TAURI, "target", "release");
// Measured: dev and test share about 1.7 GB of dependency artifacts. A much
// lower cap evicts that working set and every build recompiles dependencies.
const MAX_SIZE = "2.5GB";

/** Deletes release build intermediates and keeps target/release/bundle (the installers). */
function clearReleaseIntermediates() {
  if (!existsSync(RELEASE_DIR)) return;
  for (const entry of readdirSync(RELEASE_DIR)) {
    if (entry === "bundle") continue;
    rmSync(join(RELEASE_DIR, entry), { recursive: true, force: true });
  }
}

/** Removes the oldest build outputs until src-tauri/target fits under MAX_SIZE. */
function sweepToMaxSize() {
  const result = spawnSync("cargo", ["sweep", "--maxsize", MAX_SIZE, "."], {
    cwd: SRC_TAURI,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.stderr.write("clean:target skipped. Install cargo-sweep once with: cargo install cargo-sweep\n");
  }
}

if (process.argv.includes("--release")) clearReleaseIntermediates();
sweepToMaxSize();
