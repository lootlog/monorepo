import { VerifyTokenOptions, VerifyTokenResponse } from "./verify-jwt.types.js";
import { jwtVerify, createRemoteJWKSet, createLocalJWKSet } from "jose";

export async function validateToken({
  token,
  jwksUri,
  jwks,
  issuer,
  audience,
}: VerifyTokenOptions): Promise<VerifyTokenResponse> {
  let keyset;

  if (jwks) {
    keyset = createLocalJWKSet(jwks);
  }

  if (jwksUri) {
    keyset = createRemoteJWKSet(new URL(jwksUri));
  }

  if (!keyset) {
    throw new Error("No keyset provided");
  }

  try {
    const { payload } = await jwtVerify(token, keyset, {
      issuer,
      audience,
    });

    return {
      userId: payload.sub,
      discordId: payload.discordId as string,
    };
  } catch (error) {
    throw error;
  }
}
