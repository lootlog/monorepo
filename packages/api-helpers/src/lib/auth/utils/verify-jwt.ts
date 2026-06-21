import { jwtVerify, createRemoteJWKSet, createLocalJWKSet } from "jose";
import type {
  VerifyTokenOptions,
  VerifyTokenResponse,
} from "./verify-jwt.types.js";

function createKeyset({
  jwks,
  jwksUri,
}: Pick<VerifyTokenOptions, "jwks" | "jwksUri">) {
  if (jwks) {
    return createLocalJWKSet(jwks);
  }

  if (jwksUri) {
    return createRemoteJWKSet(new URL(jwksUri));
  }

  throw new Error("No keyset provided");
}

export async function validateToken({
  token,
  jwksUri,
  jwks,
  issuer,
  audience,
}: VerifyTokenOptions): Promise<VerifyTokenResponse> {
  const keyset = createKeyset({ jwks, jwksUri });

  const { payload } = await jwtVerify(token, keyset, {
    issuer,
    audience,
  });

  return {
    userId: payload.sub,
    discordId: payload.discordId as string,
  };
}
