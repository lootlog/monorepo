import { getApiClient } from "@/lib/api-client";

export interface User {
  avatar?: string;
  banner?: string;
  discriminator: string;
  globalName: string;
  id: string;
  username: string;
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const client = getApiClient("default");
  const response = await client.get<User>("/users/@me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}
