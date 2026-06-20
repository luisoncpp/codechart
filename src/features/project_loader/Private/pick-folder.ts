import { open } from "@tauri-apps/plugin-dialog";

/** A folder chooser: resolves to the picked absolute path, or null if cancelled. */
export type FolderPicker = () => Promise<string | null>;

/** Default picker backed by the native Tauri directory dialog. */
export const pickFolder: FolderPicker = async () => {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
};
