import { z } from "zod";
import { getPortalEnvironment } from "./environment";
const keySchema = z.object({
  id: z.string(),
  name: z.string(),
  start: z.string().nullable(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  organizationIds: z.array(z.string()),
  mode: z.enum(["read", "read-write"]),
  personalData: z.boolean(),
});
export type ApiKey = z.infer<typeof keySchema>;
export const keyListSchema = z.object({ keys: z.array(keySchema) });
export const createdKeySchema = keySchema.extend({ key: z.string() });
export const organizationsSchema = z.array(
  z.object({ id: z.string(), name: z.string() }),
);
export async function keyRequest(path = "", init?: RequestInit) {
  const response = await fetch(
    `${getPortalEnvironment(location.hostname).auth}/auth/api-keys${path}`,
    {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  const result: unknown = await response.json();
  return result;
}

export function isApiKeyActive(
  key: Pick<ApiKey, "expiresAt">,
  observedAt: number,
): boolean {
  return key.expiresAt === null || Date.parse(key.expiresAt) > observedAt;
}
