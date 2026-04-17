import { AUTH_SERVICE_URL } from "@/config/auth";
import { getApiClient } from "@/lib/api-client";

export async function fetchAuthToken(sessionToken: string): Promise<string> {
  const response = await fetch(`${AUTH_SERVICE_URL}/idp/token`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch auth token");
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export async function fetchAuthScopes(): Promise<string[]> {
  const client = getApiClient("auth");
  const response = await client.get<string[]>("/auth/@me/scopes");
  const data = response.data;

  return Array.isArray(data) ? data : [];
}
