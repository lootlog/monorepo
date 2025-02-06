import { decode, verify } from "hono/jwt";
import type { TokenHeader } from "hono/utils/jwt/jwt";
import { jwksClient } from "../jwks.js";
import type { Context } from "hono";
import { bearerAuth } from "hono/bearer-auth";

export const verifyToken = async (token: string, c: Context) => {
  if (!token) return false;

  const decodedToken = decode(token);
  const header = decodedToken.header as TokenHeader & { kid: string };
  const signingKey = await jwksClient.getSigningKey(header.kid);

  try {
    await verify(token, signingKey.getPublicKey(), decodedToken.header.alg);
    const userId = decodedToken.payload.sub;

    c.set("userId", userId);
    c.set("discordId", decodedToken.payload.discordId);

    return true;
  } catch (e) {
    console.log(e);

    return false;
  }
};

export const verifyTokenMiddleware = bearerAuth({
  verifyToken,
});
