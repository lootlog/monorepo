import type { DiscordProfile } from "better-auth/social-providers";
import { getTestInstance } from "better-auth/test";
import { createDiscordAuthOptions } from "./discord-auth-options";

const DISCORD_ID = "123456789012345678";
const DISCORD_EMAIL = "discord-user@example.com";

const discordProfile = {
  id: DISCORD_ID,
  username: "discord-user",
  discriminator: "0",
  global_name: "Discord User",
  avatar: null,
  mfa_enabled: false,
  banner: null,
  accent_color: null,
  locale: "en",
  verified: true,
  email: DISCORD_EMAIL,
  flags: 0,
  premium_type: 0,
  public_flags: 0,
  display_name: "Discord User",
  avatar_decoration: null,
  banner_color: null,
  image_url: "",
} satisfies DiscordProfile;

const storeResponseCookies = (
  requestHeaders: Headers,
  responseHeaders: Headers,
) => {
  const cookies = new Map(
    (requestHeaders.get("cookie") ?? "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf("=");

        return [
          cookie.slice(0, separatorIndex),
          cookie.slice(separatorIndex + 1),
        ];
      }),
  );

  for (const setCookieHeader of responseHeaders.getSetCookie()) {
    const [cookie] = setCookieHeader.split(";");

    if (!cookie) {
      continue;
    }

    const separatorIndex = cookie.indexOf("=");
    cookies.set(
      cookie.slice(0, separatorIndex),
      cookie.slice(separatorIndex + 1),
    );
  }

  requestHeaders.set(
    "cookie",
    [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
  );
};

describe("Discord OAuth identity", async () => {
  const { auth, client } = await getTestInstance(
    createDiscordAuthOptions({
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      redirectURI: "http://localhost:3000/api/auth/callback/discord",
      scopes: ["identify", "email"],
    }),
    { disableTestUser: true },
  );

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input) => {
        const requestURL =
          input instanceof Request ? input.url : input.toString();
        const parsedRequestURL = new URL(requestURL);

        if (requestURL === "https://discord.com/api/oauth2/token") {
          return Promise.resolve(
            Response.json({
              access_token: "test-access-token",
              refresh_token: "test-refresh-token",
              token_type: "Bearer",
              expires_in: 3600,
              scope: "identify email",
            }),
          );
        }

        if (
          parsedRequestURL.origin === "https://discord.com" &&
          decodeURIComponent(parsedRequestURL.pathname) === "/api/users/@me"
        ) {
          return Promise.resolve(Response.json(discordProfile));
        }

        return Promise.reject(
          new Error(`Unexpected external request: ${requestURL}`),
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const signInWithDiscord = async () => {
    const authHeaders = new Headers();
    const signInResponse = await client.signIn.social({
      provider: "discord",
      callbackURL: "/",
      fetchOptions: {
        onSuccess: ({ response }) => {
          storeResponseCookies(authHeaders, response.headers);
        },
      },
    });
    const authorizationURL = new URL(signInResponse.data?.url ?? "");
    const state = authorizationURL.searchParams.get("state") ?? "";
    let callbackLocation = "";

    await client.$fetch("/callback/discord", {
      method: "GET",
      query: { code: "test-code", state },
      headers: authHeaders,
      onError: ({ response }) => {
        callbackLocation = response.headers.get("location") ?? "";
        storeResponseCookies(authHeaders, response.headers);
      },
    });

    return { authHeaders, callbackLocation };
  };

  it("provisions a new user with the Discord profile id", async () => {
    const { authHeaders, callbackLocation } = await signInWithDiscord();

    expect(callbackLocation).not.toContain("discordId_is_required");

    const sessionResponse = await auth.api.getSession({
      headers: authHeaders,
    });

    expect(sessionResponse?.user.discordId).toBe(DISCORD_ID);
  });

  it("rejects attempts to change the Discord profile id", async () => {
    const { authHeaders } = await signInWithDiscord();

    let updateError: unknown;

    try {
      await auth.api.updateUser({
        body: { discordId: "999999999999999999" },
        headers: authHeaders,
      });
    } catch (error) {
      updateError = error;
    }

    expect(updateError).toMatchObject({
      body: { code: "DISCORD_ID_IMMUTABLE" },
      status: "BAD_REQUEST",
    });

    const sessionResponse = await auth.api.getSession({
      headers: authHeaders,
    });

    expect(sessionResponse?.user.discordId).toBe(DISCORD_ID);
  });

  it("signs in an existing Discord user without changing their identity", async () => {
    await signInWithDiscord();
    const { authHeaders, callbackLocation } = await signInWithDiscord();

    expect(callbackLocation).not.toContain("error");

    const sessionResponse = await auth.api.getSession({
      headers: authHeaders,
    });

    expect(sessionResponse?.user.discordId).toBe(DISCORD_ID);
  });
});
