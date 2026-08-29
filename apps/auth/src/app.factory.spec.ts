import { Readable } from "node:stream";
import { buildBetterAuthRequest } from "./app.factory.helpers.js";

type MockRawRequest = Readable & {
  headers: Record<string, string>;
  method: string;
  socket: { encrypted: boolean };
  url: string;
};

const createRequest = ({
  body,
  headers,
  method,
  rawBody,
  socketEncrypted = false,
  url,
}: {
  body?: unknown;
  headers: Record<string, string>;
  method: string;
  rawBody?: string;
  socketEncrypted?: boolean;
  url: string;
}) => {
  const rawRequest = Readable.from(rawBody ? [rawBody] : []) as MockRawRequest;
  rawRequest.headers = headers;
  rawRequest.method = method;
  rawRequest.url = url;
  rawRequest.socket = { encrypted: socketEncrypted };

  return {
    body,
    headers,
    method,
    raw: rawRequest,
    url,
  } as never;
};

describe("buildBetterAuthRequest", () => {
  it("keeps parsed JSON bodies for Better Auth routes", async () => {
    const request = createRequest({
      body: {
        provider: "discord",
        disableRedirect: true,
      },
      headers: {
        "content-type": "application/json",
        host: "localhost",
      },
      method: "POST",
      url: "/idp/sign-in/social",
    });

    const authRequest = await buildBetterAuthRequest(request);

    await expect(authRequest.json()).resolves.toEqual({
      provider: "discord",
      disableRedirect: true,
    });
  });

  it("falls back to the raw request stream when Fastify body is undefined", async () => {
    const request = createRequest({
      headers: {
        "content-type": "application/json",
        host: "localhost",
      },
      method: "POST",
      rawBody: JSON.stringify({
        provider: "discord",
        callbackURL: "http://localhost/@me",
      }),
      url: "/idp/sign-in/social",
    });

    const authRequest = await buildBetterAuthRequest(request);

    await expect(authRequest.json()).resolves.toEqual({
      provider: "discord",
      callbackURL: "http://localhost/@me",
    });
  });

  it("preserves callback query parameters for GET requests", async () => {
    const request = createRequest({
      headers: {
        host: "localhost",
      },
      method: "GET",
      url: "/idp/callback/discord?code=test-code&state=test-state",
    });

    const authRequest = await buildBetterAuthRequest(request);

    expect(authRequest.url).toBe(
      "http://localhost/idp/callback/discord?code=test-code&state=test-state",
    );
    expect(authRequest.method).toBe("GET");
  });

  it("uses the first forwarded protocol when building the request origin", async () => {
    const request = createRequest({
      headers: {
        host: "lootlog.pl",
        "x-forwarded-proto": "https, http",
      },
      method: "GET",
      url: "/idp/callback/discord",
    });

    const authRequest = await buildBetterAuthRequest(request);

    expect(authRequest.url).toBe("https://lootlog.pl/idp/callback/discord");
  });

  it("uses the socket protocol when forwarded protocol is absent", async () => {
    const request = createRequest({
      headers: {
        host: "lootlog.pl",
      },
      method: "GET",
      socketEncrypted: true,
      url: "/idp/callback/discord",
    });

    const authRequest = await buildBetterAuthRequest(request);

    expect(authRequest.url).toBe("https://lootlog.pl/idp/callback/discord");
  });
});
