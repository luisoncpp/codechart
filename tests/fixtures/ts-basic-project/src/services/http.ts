// @Architecture(type=Module, group=services, descriptionShort="HTTP transport", descriptionLong="Single choke point for network access; services depend on this, not fetch.", icon="globe")

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return (await response.json()) as T;
}
