import type {
  VerifyTokenOptions,
  VerifyTokenResponse,
} from "./verify-jwt.types.js";
import { jwtVerify, createRemoteJWKSet, createLocalJWKSet } from "jose";

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
