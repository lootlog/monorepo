import { createHmac, timingSafeEqual } from "node:crypto";
import { validateToken } from "./verify-jwt.js";

type HeaderValue = string | string[] | undefined;

export type AuthenticatedUser = {
  userId: string;
  discordId: string;
  source: "bearer" | "forwarded";
};

export const FORWARDED_AUTH_MAX_AGE_MS = 60_000;

function getHeader(
  headers: Record<string, unknown>,
  name: string,
): HeaderValue {
  const lowerCaseName = name.toLowerCase();
  const value =
    headers[lowerCaseName] ??
    headers[name] ??
    headers[
      Object.keys(headers).find(
        (header) => header.toLowerCase() === lowerCaseName,
      ) ?? ""
    ];

  if (typeof value === "string" || Array.isArray(value)) {
    return value;
  }

  return undefined;
}

export function getHeaderValue(
  headers: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = getHeader(headers, name);
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function createForwardedAuthSignature(
  userId: string,
  discordId: string,
  timestamp: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${userId}:${discordId}:${timestamp}`)
    .digest("hex");
}

export function verifyForwardedAuthHeaders(
  headers: Record<string, unknown>,
  secret: string,
  maxAgeMs = FORWARDED_AUTH_MAX_AGE_MS,
): AuthenticatedUser | null {
  const userId = getHeaderValue(headers, "x-auth-user-id");
  const discordId = getHeaderValue(headers, "x-auth-discord-id");
  const timestamp = getHeaderValue(headers, "x-auth-timestamp");
  const signature = getHeaderValue(headers, "x-auth-signature");

  if (!userId || !discordId || !timestamp || !signature) {
    return null;
  }

  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) {
    return null;
  }

  if (Math.abs(Date.now() - numericTimestamp) > maxAgeMs) {
    return null;
  }

  const expectedSignature = createForwardedAuthSignature(
    userId,
    discordId,
    timestamp,
    secret,
  );

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  return {
    userId,
    discordId,
    source: "forwarded",
  };
}

export async function authenticateHeaders({
  headers,
  authServiceUrl,
  authJwksUri,
  forwardedAuthSecret,
}: {
  headers: Record<string, unknown>;
  authServiceUrl?: string;
  authJwksUri?: string;
  forwardedAuthSecret?: string;
}): Promise<AuthenticatedUser | null> {
  const authorization = getHeaderValue(headers, "authorization");

  if (authorization?.startsWith("Bearer ") && authServiceUrl) {
    try {
      const token = authorization.slice("Bearer ".length).trim();
      const verifiedUser = await validateToken({
        token,
        issuer: authServiceUrl,
        audience: authServiceUrl,
        jwksUri: authJwksUri || `${authServiceUrl}/idp/jwks`,
      });

      if (verifiedUser.userId && verifiedUser.discordId) {
        return {
          userId: verifiedUser.userId,
          discordId: verifiedUser.discordId,
          source: "bearer",
        };
      }
    } catch {
      return null;
    }
  }

  if (!forwardedAuthSecret) {
    return null;
  }

  return verifyForwardedAuthHeaders(headers, forwardedAuthSecret);
}
