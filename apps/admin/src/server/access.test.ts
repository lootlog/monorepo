import { describe, expect, it } from "bun:test";
import {
  type JWTPayload,
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from "jose";
import { verifyAccessToken } from "./access.js";

const access = { teamDomain: "team.cloudflareaccess.com", audience: "panel" };

const { privateKey, publicKey } = await generateKeyPair("RS256");

const keySet = createLocalJWKSet({
  keys: [{ ...(await exportJWK(publicKey)), kid: "key-1", alg: "RS256" }],
});

const token = (
  claims: JWTPayload = { email: "Operator@Example.test" },
  {
    issuer = `https://${access.teamDomain}`,
    audience = access.audience,
    expiresAt = "5m",
    key = privateKey,
  }: {
    issuer?: string;
    audience?: string;
    expiresAt?: string;
    key?: CryptoKey;
  } = {},
) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "key-1" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);

describe("verifyAccessToken", () => {
  it("returns the lower-cased email of a token Access signed for the panel", async () => {
    expect(await verifyAccessToken(await token(), access, keySet)).toBe(
      "operator@example.test",
    );
  });

  it("rejects a token signed with another key", async () => {
    const stranger = await generateKeyPair("RS256");

    expect(
      await verifyAccessToken(
        await token(undefined, { key: stranger.privateKey }),
        access,
        keySet,
      ),
    ).toBeUndefined();
  });

  it.each([
    ["another Access application", { audience: "grafana" }],
    ["another team", { issuer: "https://other.cloudflareaccess.com" }],
    ["an earlier sign-in that expired", { expiresAt: "-1m" }],
  ])("rejects a token for %s", async (_case, options) => {
    expect(
      await verifyAccessToken(await token(undefined, options), access, keySet),
    ).toBeUndefined();
  });

  it("rejects a service token, which names no person", async () => {
    expect(
      await verifyAccessToken(
        await token({ common_name: "service.access" }),
        access,
        keySet,
      ),
    ).toBeUndefined();
  });
});
