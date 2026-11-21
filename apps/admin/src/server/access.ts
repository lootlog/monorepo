import { Predicate } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AdminConfig } from "./config.js";

/** The header Cloudflare Access adds to every request it lets through. */
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

/**
 * The email in an Access token signed by the team for this application, or
 * undefined when the token is forged, expired or meant for another one. The
 * tunnel alone proves nothing: anything inside the cluster can reach the port.
 */
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
