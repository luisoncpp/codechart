import { invoke } from "@tauri-apps/api/core";

export async function missing(): Promise<void> {
  await invoke("missing_cmd");
}
