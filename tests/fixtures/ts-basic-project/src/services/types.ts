export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
}
