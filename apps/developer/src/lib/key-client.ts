import { z } from "zod";
import { portalText as t } from "./translations";
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

const keyErrorMessages = new Map([
  ["API keys are disabled", t.keysDisabled],
  ["Organization service unavailable", t.organizationServiceUnavailable],
  ["Organization access required", t.organizationAccessRequired],
  ["Maximum active API keys reached", t.keyLimit],
  ["Session required", t.keySessionRequired],
  ["API key creation failed", t.keyCreationFailed],
]);

class KeyRequestError extends Error {}

// Caught exceptions are untrusted; only our parsed HTTP errors may expose a message.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function getKeyErrorMessage(error: unknown) {
  return error instanceof KeyRequestError ? error.message : t.error;
}

export async function keyRequest(path = "", init?: RequestInit) {
  const response = await fetch(
    `${getPortalEnvironment(location.hostname).auth}/auth/api-keys${path}`,
    {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const parsed = z.object({ message: z.string() }).safeParse(body);
    throw new KeyRequestError(
      parsed.success
        ? (keyErrorMessages.get(parsed.data.message) ?? t.error)
        : t.error,
    );
  }

  const result: unknown = await response.json();

  return result;
}

export function isApiKeyActive(
  key: Pick<ApiKey, "expiresAt">,
  observedAt: number,
): boolean {
  return key.expiresAt === null || Date.parse(key.expiresAt) > observedAt;
}
