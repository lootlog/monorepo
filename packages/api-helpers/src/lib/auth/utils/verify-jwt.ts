import { createLocalJWKSet, createRemoteJWKSet, jwtVerify } from "jose";
import type {
  Jwks,
  JwksKeys,
  VerifyTokenOptions,
  VerifyTokenResponse,
} from "./verify-jwt.types.js";

export type { Jwks, JwksKeys, VerifyTokenOptions, VerifyTokenResponse };

export async function validateToken({
  token,
  jwksUri,
  jwks,
  issuer,
  audience,
}: VerifyTokenOptions): Promise<VerifyTokenResponse> {
  const keyset = jwks
    ? createLocalJWKSet(jwks)
    : jwksUri
      ? createRemoteJWKSet(new URL(jwksUri))
      : undefined;

  if (!keyset) {
    throw new Error("No keyset provided");
  }

  const { payload } = await jwtVerify(token, keyset, {
    issuer,
    audience,
  });

  return {
    userId: payload.sub,
    discordId: payload.discordId as string,
  };
}
