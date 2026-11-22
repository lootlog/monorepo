import { Predicate } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AdminConfig } from "./config.js";

export const ACCESS_TOKEN_HEADER = "cf-access-jwt-assertion";

type Access = NonNullable<AdminConfig["access"]>;

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

const keySetFor = (teamDomain: string) => {
  const existing = keySets.get(teamDomain);

  if (existing) return existing;

  const keySet = createRemoteJWKSet(
    new URL(`https://${teamDomain}/cdn-cgi/access/certs`),
  );

  keySets.set(teamDomain, keySet);

  return keySet;
};

export const verifyAccessToken = async (
  token: string,
  access: Access,
  keySet: Parameters<typeof jwtVerify>[1] = keySetFor(access.teamDomain),
): Promise<string | undefined> => {
  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: `https://${access.teamDomain}`,
      audience: access.audience,
      algorithms: ["RS256"],
    });

    return Predicate.isString(payload.email) && payload.email !== ""
      ? payload.email.toLowerCase()
      : undefined;
  } catch {
    return undefined;
  }
};
