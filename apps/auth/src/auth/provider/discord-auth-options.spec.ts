import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { DiscordProfile } from "better-auth/social-providers";
import { getTestInstance } from "better-auth/test";
import { jwt } from "better-auth/plugins/jwt";
import { decodeJwt } from "jose";
import { createDiscordAuthOptions } from "./discord-auth-options.js";

const DISCORD_EMAIL = "discord-user@example.com";
const DISCORD_A = "123456789012345671";
const DISCORD_B = "123456789012345672";
const DISCORD_C = "123456789012345673";

const createDiscordProfile = ({
  email = DISCORD_EMAIL,
  emailVerified = true,
  id,
}: {
  email?: string;
  emailVerified?: boolean;
  id: string;
}) =>
  ({
    id,
    username: `discord-user-${id}`,
    discriminator: "0",
    global_name: `Discord User ${id}`,
    avatar: null,
    mfa_enabled: false,
    banner: null,
    accent_color: null,
    locale: "en",
    verified: emailVerified,
    email,
    flags: 0,
    premium_type: 0,
    public_flags: 0,
    display_name: `Discord User ${id}`,
    avatar_decoration: null,
    banner_color: null,
    image_url: "",
  }) satisfies DiscordProfile;

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

const createTestInstance = () =>
  getTestInstance(
    {
      ...createDiscordAuthOptions({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        redirectURI: "http://localhost:3000/api/auth/callback/discord",
        scopes: ["identify", "email"],
      }),
      account: {
        identityStrategy: "provider-id" as const,
        accountLinking: {
          enabled: true,
          disableImplicitLinking: false,
          allowDifferentEmails: false,
          updateUserInfoOnLink: true,
        },
      },
      plugins: [
        jwt({
          jwt: {
            definePayload: ({ user }) => ({
              discordId: user.discordId,
            }),
          },
        }),
      ],
    },
    { disableTestUser: true },
  );

type TestInstance = Awaited<ReturnType<typeof createTestInstance>>;

const originalFetch = globalThis.fetch;

describe("Discord OAuth identity", () => {
  let activeDiscordProfile: DiscordProfile;
  let instance: TestInstance;

  beforeEach(async () => {
    instance = await createTestInstance();

    activeDiscordProfile = createDiscordProfile({ id: DISCORD_A });
    globalThis.fetch = mock((input: URL | RequestInfo) => {
      const requestURL =
        input instanceof Request ? input.url : input.toString();
      const parsedRequestURL = new URL(requestURL);

      if (requestURL === "https://discord.com/api/oauth2/token") {
        return Promise.resolve(
          Response.json({
            access_token: `access-token-${activeDiscordProfile.id}`,
            refresh_token: `refresh-token-${activeDiscordProfile.id}`,
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
        return Promise.resolve(Response.json(activeDiscordProfile));
      }

      return Promise.reject(
        new Error(`Unexpected external request: ${requestURL}`),
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const signInWithDiscord = async (profile: DiscordProfile) => {
    activeDiscordProfile = profile;
    const authHeaders = new Headers();
    const signInResponse = await instance.client.signIn.social({
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

    await instance.client.$fetch("/callback/discord", {
      method: "GET",
      query: { code: `code-${profile.id}`, state },
      headers: authHeaders,
      onError: ({ response }) => {
        callbackLocation = response.headers.get("location") ?? "";
        storeResponseCookies(authHeaders, response.headers);
      },
    });

    const session = await instance.auth.api.getSession({
      headers: authHeaders,
    });

    return { authHeaders, callbackLocation, session };
  };

  it("provisions a user from the verified Discord profile", async () => {
    const discordProfile = createDiscordProfile({ id: DISCORD_A });
    const result = await signInWithDiscord(discordProfile);

    expect(result.callbackLocation).not.toContain("error");
    expect(result.session?.user.discordId).toBe(discordProfile.id);
  });

  it("rejects attempts to change the Discord profile id through updateUser", async () => {
    const result = await signInWithDiscord(
      createDiscordProfile({ id: DISCORD_A }),
    );

    await expect(
      instance.auth.api.updateUser({
        body: { discordId: "spoofed-discord-id" },
        headers: result.authHeaders,
      }),
    ).rejects.toMatchObject({
      body: { code: "DISCORD_ID_IMMUTABLE" },
      status: "BAD_REQUEST",
    });

    const session = await instance.auth.api.getSession({
      headers: result.authHeaders,
    });
    expect(session?.user.discordId).toBe(DISCORD_A);
  });

  it("links and switches between three verified Discord accounts with the same email", async () => {
    const first = await signInWithDiscord(
      createDiscordProfile({ id: DISCORD_A }),
    );
    const second = await signInWithDiscord(
      createDiscordProfile({ id: DISCORD_B }),
    );

    expect(second.session?.user.id).toBe(first.session?.user.id);
    expect(second.session?.user.discordId).toBe(DISCORD_B);
    const firstSessionAfterSwitch = await instance.auth.api.getSession({
      headers: first.authHeaders,
    });
    expect(firstSessionAfterSwitch?.user.discordId).toBe(DISCORD_B);
    expect(
      await instance.auth.api.listSessions({ headers: second.authHeaders }),
    ).toHaveLength(2);
    const accountsAfterSwitch = await instance.auth.api.listUserAccounts({
      headers: second.authHeaders,
    });
    const activeAccount = accountsAfterSwitch.find(
      ({ accountId }) => accountId === DISCORD_B,
    );
    expect(activeAccount).toBeDefined();
    if (!second.session || !activeAccount) {
      throw new Error("Expected an active Discord session and account");
    }
    const activeToken = await instance.auth.api.getAccessToken({
      body: {
        userId: second.session.user.id,
        accountId: activeAccount.id,
      },
    });
    expect(activeToken.accessToken).toBe(`access-token-${DISCORD_B}`);
    const jwtResponse = await instance.auth.api.getToken({
      headers: second.authHeaders,
    });
    expect(decodeJwt(jwtResponse.token).discordId).toBe(DISCORD_B);

    const third = await signInWithDiscord(
      createDiscordProfile({ id: DISCORD_C }),
    );
    const switchedBack = await signInWithDiscord(
      createDiscordProfile({ id: DISCORD_A }),
    );
    expect(third.session?.user.id).toBe(first.session?.user.id);
    expect(third.session?.user.discordId).toBe(DISCORD_C);
    expect(switchedBack.session?.user.id).toBe(first.session?.user.id);
    expect(switchedBack.session?.user.discordId).toBe(DISCORD_A);

    const linkedAccounts = await instance.auth.api.listUserAccounts({
      headers: switchedBack.authHeaders,
    });
    expect(linkedAccounts.map(({ accountId }) => accountId).sort()).toEqual([
      DISCORD_A,
      DISCORD_B,
      DISCORD_C,
    ]);
  });

  it("does not link a Discord account with a different email", async () => {
    const first = await signInWithDiscord(
      createDiscordProfile({ id: DISCORD_A }),
    );
    const second = await signInWithDiscord(
      createDiscordProfile({
        id: DISCORD_B,
        email: "different@example.com",
      }),
    );

    expect(second.session?.user.id).not.toBe(first.session?.user.id);
    expect(second.session?.user.discordId).toBe(DISCORD_B);
  });

  it("does not link an unverified Discord account by matching email", async () => {
    await signInWithDiscord(createDiscordProfile({ id: DISCORD_A }));
    const second = await signInWithDiscord(
      createDiscordProfile({
        id: DISCORD_B,
        emailVerified: false,
      }),
    );

    expect(second.callbackLocation).toContain("account_not_linked");
    expect(second.session).toBeNull();
  });
});
