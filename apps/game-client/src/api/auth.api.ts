import { getApiClient } from "@/lib/api-client";

export async function fetchAuthScopes(): Promise<string[]> {
  const client = getApiClient("auth");
  const response = await client.get<string[]>("/auth/@me/scopes");
  const data = response.data;

  return Array.isArray(data) ? data : [];
}
