import { decode, verify } from "hono/jwt";
import type { TokenHeader } from "hono/utils/jwt/jwt";
import { jwksClient } from "../jwks.js";

export const verifyToken = async (token: string) => {
  let discordId, userId;

  if (!token) return { discordId, userId };

  const decodedToken = decode(token);
  const header = decodedToken.header as TokenHeader & { kid: string };
  const signingKey = await jwksClient.getSigningKey(header.kid);

  try {
    await verify(token, signingKey.getPublicKey(), decodedToken.header.alg);

    userId = decodedToken.payload.sub as string;
    discordId = decodedToken.payload.discordId as string;
  } catch (e) {
    console.log(e);
  }

  return { userId, discordId };
};
