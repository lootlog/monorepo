import {
  ApiKeyEndpointPolicy,
  apiKeyEndpointPolicyLayer,
} from "@lootlog/schema/api-key-http";
import { expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "effect/unstable/http";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import { Permission } from "@lootlog/schema/permissions";
import { BearerSecurityMiddleware } from "#src/http-api/contracts/shared";
import { ForwardAuthMiddlewareLive } from "#src/runtime/auth/forward-auth-middleware";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { makeAllTimerList } from "#src/http-api/handlers/timers/timer-list.data-layer";
import { makeUserFeed } from "#src/feed/user-feed";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  timerTable,
  guildKillActivityTable,
} from "#src/database/drizzle/schema";
import { createDatabaseBoundary } from "./database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "./organization-fixtures.js";

// Exercise the deployed credential middleware and source queries together; no domain query is mocked.
const api = HttpApi.make("DeveloperScopeProof")
  .add(
    HttpApiGroup.make("scope")
      .add(
        HttpApiEndpoint.get("timers", "/timers", {
          success: Schema.Unknown,
        }).annotate(OpenApi.Identifier, "TimersController_getAllTimers"),
        HttpApiEndpoint.get("feed", "/feed", {
          success: Schema.Unknown,
        }).annotate(OpenApi.Identifier, "UsersController_getUserFeed"),
        HttpApiEndpoint.post("write", "/write", {
          success: Schema.Unknown,
        }).annotate(OpenApi.Identifier, "TimersController_createAutoTimer"),
        HttpApiEndpoint.get("preferences", "/preferences", {
          success: Schema.Unknown,
        }).annotate(
          OpenApi.Identifier,
          "SettingsDocumentsController_getPreferences",
        ),
        HttpApiEndpoint.patch("patchPreferences", "/preferences", {
          success: Schema.Unknown,
        }).annotate(
          OpenApi.Identifier,
          "SettingsDocumentsController_patchPreferences",
        ),
        HttpApiEndpoint.get("timerPreferences", "/timer-settings", {
          success: Schema.Unknown,
        }).annotate(
          OpenApi.Identifier,
          "TimerSettingsController_getGlobalSettings",
        ),
        HttpApiEndpoint.patch("patchTimerPreferences", "/timer-settings", {
          success: Schema.Unknown,
        }).annotate(
          OpenApi.Identifier,
          "TimerSettingsController_updateGlobalSettings",
        ),
        HttpApiEndpoint.get(
          "guildTimerPreferences",
          "/timer-settings/guilds/123",
          { success: Schema.Unknown },
        ).annotate(
          OpenApi.Identifier,
          "TimerSettingsController_getGuildSettings",
        ),
        HttpApiEndpoint.patch(
          "patchGuildTimerPreferences",
          "/timer-settings/guilds/123",
          { success: Schema.Unknown },
        ).annotate(
          OpenApi.Identifier,
          "TimerSettingsController_updateGuildSettings",
        ),
        HttpApiEndpoint.get("personal", "/personal", {
          success: Schema.Unknown,
        }).annotate(OpenApi.Identifier, "UsersController_getUserKillStats"),
      )
      .middleware(BearerSecurityMiddleware),
  )
  .middleware(ApiKeyEndpointPolicy);

it("keeps timer/feed sources scoped across concurrent keys and membership loss", async () => {
  const databaseBoundary = await createDatabaseBoundary();
  const database = databaseBoundary.database;
  const now = new Date();
  await databaseBoundary.run(
    database
      .insert(guildTable)
      .values(["123", "456"].map((id) => createGuildFixture({ id }))),
  );
  await databaseBoundary.run(
    database.insert(memberTable).values(
      ["123", "456"].map((guildId, index) =>
        createMemberFixture({
          id: index + 1,
          guildId,
          userId: "discord",
          globalUserId: "user",
        }),
      ),
    ),
  );
  await databaseBoundary.run(
    database.insert(roleTable).values(
      ["123", "456"].map((guildId) => ({
        id: `role-${guildId}`,
        guildId,
        name: "Reader",
        permissions: [
          Permission.LOOTLOG_ACCESS,
          Permission.LOOTLOG_TIMERS_READ,
          Permission.LOOTLOG_LOOTS_READ,
        ],
        lvlRangeFrom: 0,
        lvlRangeTo: 999,
        updatedAt: now,
      })),
    ),
  );
  await databaseBoundary.run(
    database.insert(memberToRoleTable).values([
      { A: 1, B: "role-123" },
      { A: 2, B: "role-456" },
    ]),
  );
  await databaseBoundary.run(
    database.insert(timerTable).values(
      ["123", "456"].map((guildId, index) => ({
        guildId,
        createdById: index + 1,
        npcId: 105,
        timerKey: "105:npc",
        world: "world",
        npc: { id: 105, lvl: 105, type: "ELITE2", name: "NPC" },
        minSpawnTime: now,
        maxSpawnTime: new Date(now.getTime() + 60000),
        updatedAt: now,
      })),
    ),
  );
  await databaseBoundary.run(
    database.insert(guildKillActivityTable).values(
      ["123", "456"].map((guildId) => ({
        id: `kill-${guildId}`,
        guildId,
        world: "world",
        npcId: 105,
        npcName: "NPC",
        npcType: "ELITE2" as const,
        npcLvl: 105,
        occurredAt: new Date(now.getTime() - 120000),
      })),
    ),
  );

  const run = <A, E>(operation: Effect.Effect<A, E>) =>
    Effect.map(Effect.orDie(operation), (value) =>
      HttpServerResponse.jsonUnsafe(value),
    );

  const routes = HttpApiBuilder.layer(api).pipe(
    Layer.provide(
      HttpApiBuilder.group(api, "scope", (handlers) =>
        handlers
          .handleRaw("timers", () =>
            Effect.flatMap(ForwardAuthIdentity, (identity) =>
              run(makeAllTimerList(database)(identity)),
            ),
          )
          .handleRaw("feed", () =>
            Effect.flatMap(ForwardAuthIdentity, ({ discordId }) =>
              run(makeUserFeed(database)(discordId)),
            ),
          )
          .handleRaw("write", () => Effect.die("Read-only key reached a write"))
          .handleRaw("preferences", () =>
            Effect.die("Key reached raw document layers"),
          )
          .handleRaw("patchPreferences", () =>
            Effect.die("Key reached document writes"),
          )
          .handleRaw("timerPreferences", () =>
            Effect.die("Key reached raw timer preferences"),
          )
          .handleRaw("patchTimerPreferences", () =>
            Effect.die("Key reached timer preference writes"),
          )
          .handleRaw("guildTimerPreferences", () =>
            Effect.die("Key reached guild timer preferences"),
          )
          .handleRaw("patchGuildTimerPreferences", () =>
            Effect.die("Key reached guild timer preference writes"),
          )
          .handleRaw("personal", () =>
            Effect.die("Key without personal access reached personal data"),
          ),
      ),
    ),
    Layer.provide(ForwardAuthMiddlewareLive),
    Layer.provide(apiKeyEndpointPolicyLayer("main")),
    Layer.provideMerge(Layer.succeed(ApiDatabase, database)),
    Layer.provide(HttpServer.layerServices),
  );

  const boundary = HttpRouter.toWebHandler(routes, { disableLogger: true });

  const headersFor = (id: string) => ({
    "x-auth-user-id": "user",
    "x-auth-discord-id": "discord",
    "x-auth-api-key-access": JSON.stringify({
      keyId: `key-${id}`,
      organizationIds: [id],
      mode: "read",
      personalData: false,
      expiresAt: null,
    }),
  });

  const request = (path: string, id: string, method = "GET") =>
    boundary.handler(
      new Request(`https://api.test${path}`, {
        method,
        headers: headersFor(id),
      }),
    );

  try {
    for (const id of ["123", "456", "123"]) {
      const timers = await request("/timers", id);
      expect(timers.status).toBe(200);
      expect(await timers.json()).toMatchObject([{ guildId: id }]);
      const feed = await request("/feed", id);
      expect(feed.status).toBe(200);
      expect(await feed.json()).toMatchObject({ items: [{ guild: { id } }] });
    }

    expect((await request("/write", "123", "POST")).status).toBe(403);
    expect((await request("/personal", "123")).status).toBe(403);

    for (const path of [
      "/preferences",
      "/timer-settings",
      "/timer-settings/guilds/123",
    ]) {
      for (const method of ["GET", "PATCH"]) {
        const response = await boundary.handler(
          new Request(`https://api.test${path}`, {
            method,
            headers: {
              ...headersFor("123"),
              "x-auth-api-key-access": JSON.stringify({
                keyId: "full",
                organizationIds: ["123"],
                personalData: true,
                mode: "read-write",
                expiresAt: null,
              }),
            },
          }),
        );

        expect(response.status).toBe(403);
        expect(await response.text()).not.toContain("guildsOrder");
      }
    }

    expect(
      (
        await boundary.handler(
          new Request("https://api.test/timers", {
            headers: { "x-api-key": "unverified" },
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await boundary.handler(
          new Request("https://api.test/timers", {
            headers: {
              ...headersFor("123"),
              "x-auth-api-key-access": "malformed",
            },
          }),
        )
      ).status,
    ).toBe(401);
    await databaseBoundary.run(
      database
        .update(memberTable)
        .set({ active: false })
        .where(
          and(
            eq(memberTable.userId, "discord"),
            eq(memberTable.guildId, "123"),
          ),
        ),
    );
    const revokedFeed = await request("/feed", "123");
    expect(await revokedFeed.json()).toMatchObject({ items: [] });
    expect(await (await request("/feed", "456")).json()).toMatchObject({
      items: [{ guild: { id: "456" } }],
    });
  } finally {
    await boundary.dispose();
    await databaseBoundary.dispose();
  }
});
