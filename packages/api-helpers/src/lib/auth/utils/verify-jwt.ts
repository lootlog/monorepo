import { VerifyTokenOptions, VerifyTokenResponse } from "./verify-jwt.types.js";
import { jwtVerify, createRemoteJWKSet, createLocalJWKSet } from "jose";

export async function validateToken({
  token,
  jwksUri,
  jwks,
  issuer,
  audience,
}: VerifyTokenOptions): Promise<VerifyTokenResponse> {
  if (!jwks && !jwksUri) {
    throw new Error("No keyset provided");
  }

  const keyset = jwks
    ? createLocalJWKSet(jwks)
    : createRemoteJWKSet(new URL(jwksUri!));

  const { payload } = await jwtVerify(token, keyset, {
    issuer,
    audience,
  });

  return {
    userId: payload.sub,
    discordId: payload.discordId as string,
  };
}
