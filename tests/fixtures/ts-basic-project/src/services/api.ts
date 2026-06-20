import { getJson } from "./http";
import { ApiResult } from "./types";
// Intentionally unresolved: ./cache does not exist (planted unresolvedImport).
import { readCache } from "./cache";

export async function fetchTitles(): Promise<ApiResult<string[]>> {
  const cached = readCache<string[]>("titles");
  if (cached) return { ok: true, data: cached };
  const data = await getJson<string[]>("/api/titles");
  return { ok: true, data };
}
