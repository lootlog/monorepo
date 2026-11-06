import { expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import { MessagingData } from "./messaging.handlers.js";
import { makeMessagingDataLayer } from "./messaging.data-layer.js";

it("shares a going answer only with the Lootlogs where the caller reads the notification", async () => {
  const databaseBoundary = await createDatabaseBoundary();
  const createdAt = new Date().toISOString();

  // A hash per key, standing in for the Redis script around this logic.
  const hashes = new Map<string, Map<string, string>>([
    [
      "notification:hero:going:foreign",
      new Map([["stranger", JSON.stringify({ userId: "stranger" })]]),
    ],
  ]);

  const published: unknown[] = [];

  const layer = makeMessagingDataLayer(
    {
      get: (key) =>
        Effect.succeed(
          key === "notification:hero"
            ? JSON.stringify({
                discordId: "sender",
                userId: "sender-user",
                guildIds: ["mine", "restricted", "foreign"],
                createdAt,
                world: "experimental",
                npcName: "Heros",
                npc: { type: "HERO", lvl: 100, wt: 100, prof: "w", icon: "h" },
              })
            : null,
        ),
      set: () => Effect.void,
      eval: (_script, keys, args) =>
        Effect.sync(() => {
          // The sliding-window rate limit accepts every answer here.
          if (keys[0]?.startsWith("messaging:")) return [1, 0];

          const hash = hashes.get(keys[0] ?? "") ?? new Map<string, string>();
          hashes.set(keys[0] ?? "", hash);

          if (args[0] === "1") hash.set(String(args[1]), String(args[2]));
          else hash.delete(String(args[1]));

          return [...hash.values()];
        }),
    },
    {
      publish: (_key, payload) =>
        Effect.sync(() => {
          published.push(payload);
        }),
    },
    { create: () => Effect.void },
  ).pipe(Layer.provide(Layer.succeed(ApiDatabase, databaseBoundary.database)));

  const answer = (going: boolean) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const messaging = yield* MessagingData;

        return yield* messaging.going(
          { userId: "caller-user", discordId: "caller" },
          "hero",
          {
            world: "experimental",
            going,
            character: {
              accountId: "account",
              characterId: "character",
              nick: "Caller",
              lvl: 120,
              prof: "m",
              icon: "icon",
              clan: { id: 5, name: "Klan" },
            },
          },
        );
      }).pipe(Effect.provide(layer)),
    );

  try {
    await databaseBoundary.run(
      databaseBoundary.database
        .insert(guildTable)
        .values(
          ["mine", "restricted", "foreign"].map((id) =>
            createGuildFixture({ id, ownerId: `${id}-owner` }),
          ),
        ),
    );
    await databaseBoundary.run(
      databaseBoundary.database.insert(memberTable).values([
        createMemberFixture({
          id: 1,
          guildId: "mine",
          userId: "caller",
          globalUserId: "user",
        }),
        createMemberFixture({
          id: 2,
          guildId: "restricted",
          userId: "caller",
          globalUserId: "user",
        }),
      ]),
    );
    await databaseBoundary.run(
      databaseBoundary.database.insert(roleTable).values([
        {
          id: "heroes",
          guildId: "mine",
          name: "Heroes",
          updatedAt: new Date(),
          permissions: [
            Permission.LOOTLOG_NOTIFICATIONS_READ,
            Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
          ],
          lvlRangeFrom: 1,
          lvlRangeTo: 500,
        },
        {
          id: "base",
          guildId: "restricted",
          name: "Base",
          updatedAt: new Date(),
          permissions: [Permission.LOOTLOG_NOTIFICATIONS_READ],
          lvlRangeFrom: 1,
          lvlRangeTo: 500,
        },
      ]),
    );
    await databaseBoundary.run(
      databaseBoundary.database.insert(memberToRoleTable).values([
        { A: 1, B: "heroes" },
        { A: 2, B: "base" },
      ]),
    );

    const going = await answer(true);

    expect(going).toMatchObject({
      notificationId: "hero",
      guilds: [
        {
          guildId: "mine",
          going: [
            { userId: "caller-user", nick: "Caller", clan: { name: "Klan" } },
          ],
        },
      ],
    });
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      guildId: "mine",
      reporterUserId: "sender-user",
      npcName: "Heros",
    });
    expect(hashes.get("notification:hero:going:restricted")).toBeUndefined();
    expect(hashes.get("notification:hero:going:foreign")?.size).toBe(1);

    expect(await answer(false)).toEqual({
      notificationId: "hero",
      guilds: [{ guildId: "mine", going: [] }],
    });
    expect(published.at(-1)).toMatchObject({ guildId: "mine", going: [] });
  } finally {
    await databaseBoundary.dispose();
  }
});
