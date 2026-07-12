import { betterAuth, type SecondaryStorage } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { convertSetCookieToCookie } from "better-auth/test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { betterAuthSchema } from "../database/drizzle.schema";
import { createDiscordProviderOptions } from "./discord-provider-options";

const readMigration = (filename: string) =>
  readFile(resolve(process.cwd(), "drizzle", filename), "utf8");

const createMemorySecondaryStorage = (): SecondaryStorage => {
  const values = new Map<string, string>();

  return {
    delete: (key) => {
      values.delete(key);
      return Promise.resolve();
    },
    get: (key) => Promise.resolve(values.get(key) ?? null),
    set: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
  };
};

const createDiscordFetch = () =>
  vi.fn<typeof fetch>(async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);

    if (request.url === "https://discord.com/api/oauth2/token") {
      const requestBody = await request.text();
      const authorizationCode = new URLSearchParams(requestBody).get("code");

      return Response.json({
        access_token: `access-${authorizationCode}`,
        expires_in: 3600,
        refresh_token: `refresh-${authorizationCode}`,
        scope: "identify guilds email",
        token_type: "Bearer",
      });
    }

    if (new URL(request.url).pathname.startsWith("/api/users/")) {
      const authorization = request.headers.get("authorization") ?? "";
      const discordId = authorization.includes("new")
        ? "1508903364300247142"
        : "1458026490288406631";

      return Response.json({
        avatar: null,
        discriminator: "0",
        email: "player@example.com",
        global_name: "Player",
        id: discordId,
        username: "player",
        verified: true,
      });
    }

    throw new Error(`Unexpected request: ${request.method} ${request.url}`);
  });

describe("Discord account switching", () => {
  it("keeps the user and selects the Discord account used most recently", async () => {
    vi.stubGlobal("fetch", createDiscordFetch());
    const databaseClient = new PGlite();
    await databaseClient.exec(
      await readMigration("0000_loving_the_leader.sql"),
    );
    await databaseClient.exec(await readMigration("0001_odd_kid_colt.sql"));
    const database = drizzle(databaseClient, { schema: betterAuthSchema });

    const auth = betterAuth({
      basePath: "/idp",
      baseURL: "https://auth.example.com",
      database: drizzleAdapter(database, {
        provider: "pg",
        schema: betterAuthSchema,
      }),
      secondaryStorage: createMemorySecondaryStorage(),
      secret: "test-secret-that-is-at-least-32-characters",
      account: {
        accountLinking: {
          enabled: true,
          updateUserInfoOnLink: true,
        },
      },
      user: {
        additionalFields: {
          discordId: {
            type: "string",
            required: true,
            input: false,
          },
        },
      },
      socialProviders: {
        discord: createDiscordProviderOptions({
          clientId: "discord-client",
          clientSecret: "discord-secret",
          redirectURI: "https://auth.example.com/idp/callback/discord",
          scopes: ["identify", "guilds", "email"],
        }),
      },
    });

    const completeDiscordSignIn = async (authorizationCode: string) => {
      const signInResponse = await auth.api.signInSocial({
        asResponse: true,
        body: {
          callbackURL: "https://lootlog.example.com",
          provider: "discord",
        },
      });
      const signInPayload = (await signInResponse.json()) as { url: string };
      const authorizationURL = new URL(signInPayload.url);
      const callbackURL = new URL(
        "/idp/callback/discord",
        "https://auth.example.com",
      );
      callbackURL.searchParams.set("code", authorizationCode);
      callbackURL.searchParams.set(
        "state",
        authorizationURL.searchParams.get("state") ?? "",
      );

      const callbackResponse = await auth.handler(
        new Request(callbackURL, {
          headers: convertSetCookieToCookie(signInResponse.headers),
        }),
      );

      return convertSetCookieToCookie(callbackResponse.headers);
    };

    const oldSessionCookie = await completeDiscordSignIn("old");
    const oldSession = await auth.api.getSession({
      headers: oldSessionCookie,
    });
    const newSessionCookie = await completeDiscordSignIn("new");
    const newSession = await auth.api.getSession({
      headers: newSessionCookie,
    });
    const refreshedOldSession = await auth.api.getSession({
      headers: oldSessionCookie,
    });
    const linkedAccounts = await auth.api.listUserAccounts({
      headers: newSessionCookie,
    });
    const switchedBackSessionCookie = await completeDiscordSignIn("old");
    const switchedBackSession = await auth.api.getSession({
      headers: switchedBackSessionCookie,
    });
    const refreshedNewSession = await auth.api.getSession({
      headers: newSessionCookie,
    });
    const accountsAfterSwitchingBack = await auth.api.listUserAccounts({
      headers: switchedBackSessionCookie,
    });

    expect(newSession?.user.id).toBe(oldSession?.user.id);
    expect(newSession?.user.discordId).toBe("1508903364300247142");
    expect(refreshedOldSession?.user.discordId).toBe("1508903364300247142");
    expect(linkedAccounts).toHaveLength(2);
    expect(switchedBackSession?.user.id).toBe(oldSession?.user.id);
    expect(switchedBackSession?.user.discordId).toBe("1458026490288406631");
    expect(refreshedNewSession?.user.discordId).toBe("1458026490288406631");
    expect(accountsAfterSwitchingBack).toHaveLength(2);

    await databaseClient.close();
  });
});
