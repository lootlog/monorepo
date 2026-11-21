import { describe, expect, it, mock } from "bun:test";
import type { AdminConfig } from "./config.js";
import { authorizeRequest } from "./guard.js";

const config: AdminConfig = {
  authUrl: "http://auth:4000",
  adminApiSecret: "secret",
  origin: "https://admin.example.test",
  webUrl: "https://example.test/",
  access: { teamDomain: "team.cloudflareaccess.com", audience: "aud" },
  operatorEmails: new Set(["operator@example.test"]),
  devOperator: undefined,
};

const verifier = (email: string | undefined) =>
  mock((_token: string) => Promise.resolve(email));

const request = (init: RequestInit = {}) =>
  new Request("http://admin:3000/users/user-1", init);

const withToken = { "cf-access-jwt-assertion": "token" };

const status = async (
  decision: ReturnType<typeof authorizeRequest>,
): Promise<number | undefined> => {
  const result = await decision;

  return "response" in result ? result.response.status : undefined;
};

describe("authorizeRequest", () => {
  it("names the operator of a request with a verified Access token", async () => {
    expect(
      await authorizeRequest(
        request({ headers: withToken }),
        config,
        verifier("operator@example.test"),
      ),
    ).toEqual({ operator: "operator@example.test" });
  });

  it.each([
    ["without a token", {}, "operator@example.test", 401],
    ["with a token Access did not sign", withToken, undefined, 401],
    ["signed in as someone else", withToken, "stranger@example.test", 403],
  ] as const)(
    "refuses a request %s",
    async (_case, headers, email, expected) => {
      expect(
        await status(
          authorizeRequest(request({ headers }), config, verifier(email)),
        ),
      ).toBe(expected);
    },
  );

  it.each([
    ["no origin", {}],
    ["another origin", { origin: "https://evil.example" }],
    ["an opaque origin", { origin: "null" }],
    [
      "the panel's origin but a cross-site fetch",
      { origin: "https://admin.example.test", "sec-fetch-site": "cross-site" },
    ],
  ])(
    "refuses a form posted with %s before trusting its Access cookie",
    async (_case, headers) => {
      const verify = verifier("operator@example.test");

      expect(
        await status(
          authorizeRequest(
            request({ method: "POST", headers: { ...withToken, ...headers } }),
            config,
            verify,
          ),
        ),
      ).toBe(403);
      expect(verify).not.toHaveBeenCalled();
    },
  );

  it("accepts a form the panel itself posted", async () => {
    expect(
      await authorizeRequest(
        request({
          method: "POST",
          headers: {
            ...withToken,
            origin: "https://admin.example.test",
            webUrl: "https://example.test/",
            "sec-fetch-site": "same-origin",
          },
        }),
        config,
        verifier("operator@example.test"),
      ),
    ).toEqual({ operator: "operator@example.test" });
  });

  it("refuses everyone when neither Access nor a development operator is configured", async () => {
    expect(
      await status(
        authorizeRequest(
          request({ headers: withToken }),
          { ...config, access: undefined },
          verifier("operator@example.test"),
        ),
      ),
    ).toBe(401);
  });
});
