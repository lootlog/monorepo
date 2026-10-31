import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { TestClock } from "effect/testing";
import { FACTION_WARS } from "@lootlog/domain/faction-war";
import {
  factionWarDailyPointsTable,
  factionWarPickTable,
  userKillCharacterTable,
} from "#src/database/drizzle/schema";
import { makeUserAccountDeletion } from "#src/http-api/handlers/account-organization/user-account-deletion.data-layer";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  FactionWarsData,
  FactionWarsIdentity,
  getFactionWarLeaderboard,
  pickFaction,
  setFactionWarDisqualification,
} from "./faction-wars.handlers.js";

const identityOf = (userId: string, discordId: string, isAdmin = false) =>
  Layer.succeed(
    FactionWarsIdentity,
    FactionWarsIdentity.of({
      caller: Effect.succeed({ userId, discordId, isAdmin }),
    }),
  );

const pick = (userId: string, discordId: string) => ({
  warId: "2026-barbatos-tanroth",
  userId,
  discordId,
  faction: "BARBATOS" as const,
  characterId: `character-${userId}`,
  characterName: `Hero ${userId}`,
  world: "tempest",
  hiddenFromLeaderboard: false,
  championHighlightHidden: false,
  pickedAt: new Date("2026-10-20T08:00:00Z"),
});

describe("faction war picks", () => {
  it("lock one faction per Discord account, even across Lootlog accounts", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const create = (userId: string, discordId: string) =>
        boundary.run(
          FactionWarsData.pipe(
            Effect.flatMap((data) => data.createPick(pick(userId, discordId))),
            Effect.provide(FactionWarsData.layerDatabase),
          ),
        );

      expect(await create("user-1", "discord-1")).not.toBeNull();
      expect(await create("user-1", "discord-1")).toBeNull();
      expect(await create("user-2", "discord-1")).toBeNull();
    } finally {
      await boundary.dispose();
    }
  });

  it("are forgotten with a deleted account, but the Discord account cannot pick again", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database } = boundary;

      await boundary.run(
        Effect.gen(function* () {
          const data = yield* FactionWarsData.pipe(
            Effect.provide(FactionWarsData.layerDatabase),
          );

          yield* data.createPick(pick("user-1", "discord-1"));
          yield* data.createPick(pick("user-2", "discord-2"));
          yield* database.insert(factionWarDailyPointsTable).values(
            ["user-1", "user-2"].map((userId) => ({
              warId: "2026-barbatos-tanroth",
              userId,
              day: "2026-10-20",
              source: "KILL" as const,
              points: 40,
              updatedAt: new Date("2026-10-20T09:00:00Z"),
            })),
          );

          yield* makeUserAccountDeletion(database, {
            cleanupBattlelog: () => Effect.void,
            deleteCacheKey: () => Effect.void,
            invalidateCacheScopes: () => Effect.void,
            deleteCachePattern: () => Effect.void,
            publishMemberRemoved: () => Effect.void,
          })({ userId: "user-1", discordId: "discord-1" });
        }),
      );

      const remaining = await boundary.run(
        Effect.all([
          database
            .select({ userId: factionWarPickTable.userId })
            .from(factionWarPickTable),
          database
            .select({ userId: factionWarDailyPointsTable.userId })
            .from(factionWarDailyPointsTable)
            .where(eq(factionWarDailyPointsTable.source, "KILL")),
        ]),
      );

      expect(remaining).toEqual([
        [{ userId: "user-2" }],
        [{ userId: "user-2" }],
      ]);

      const repick = await boundary.run(
        FactionWarsData.pipe(
          Effect.flatMap((data) =>
            data.createPick(pick("user-3", "discord-1")),
          ),
          Effect.provide(FactionWarsData.layerDatabase),
        ),
      );

      expect(repick).toBeNull();
    } finally {
      await boundary.dispose();
    }
  });

  it("leave a disqualified player out of scores and leaderboards until restored, for admins only", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const identity = (isAdmin: boolean) =>
        identityOf("admin", "discord-admin", isAdmin);

      const run = <A, E>(
        effect: Effect.Effect<A, E, FactionWarsData | FactionWarsIdentity>,
        isAdmin = true,
      ) =>
        boundary.run(
          effect.pipe(
            Effect.provide(
              Layer.merge(FactionWarsData.layerDatabase, identity(isAdmin)),
            ),
          ),
        );

      const war = FACTION_WARS[0]!;

      await run(
        Effect.gen(function* () {
          const data = yield* FactionWarsData;

          yield* data.createPick(pick("user-1", "discord-1"));
          yield* data.createPick(pick("user-2", "discord-2"));
          yield* boundary.database.insert(factionWarDailyPointsTable).values(
            ["2026-10-20", "2026-10-21"].flatMap((day) =>
              ["user-1", "user-2"].map((userId) => ({
                warId: war.id,
                userId,
                day,
                source: "KILL" as const,
                points: 40,
                updatedAt: new Date(`${day}T09:00:00Z`),
              })),
            ),
          );
        }),
      );

      // Today's points stay off the leaderboard until the day ends, so no one
      // can time a player's hero or titan kill from their jump there.
      const standing = () =>
        run(
          Effect.gen(function* () {
            const data = yield* FactionWarsData;
            const input = yield* data.standingsInput(war);

            const leaderboard = yield* data.leaderboard(
              war.id,
              "BARBATOS",
              "2026-10-21",
            );

            return {
              players: input.players.BARBATOS,
              points: input.stats.reduce((sum, row) => sum + row.points, 0),
              leaderboard: leaderboard.map((row) => [row.userId, row.points]),
            };
          }),
        );

      await expect(
        run(
          setFactionWarDisqualification(war.id, "user-1", { reason: "bot" }),
          false,
        ),
      ).rejects.toThrow();

      await run(
        setFactionWarDisqualification(war.id, "user-1", { reason: "bot" }),
      );
      expect(await standing()).toEqual({
        players: 1,
        points: 80,
        leaderboard: [["user-2", 40]],
      });

      await run(setFactionWarDisqualification(war.id, "user-1", null));
      expect(await standing()).toEqual({
        players: 2,
        points: 160,
        leaderboard: [
          ["user-1", 40],
          ["user-2", 40],
        ],
      });
    } finally {
      await boundary.dispose();
    }
  });

  it("accept only a character the account played with, hidden from the leaderboard until the player shows it", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const war = FACTION_WARS[0]!;

      await boundary.run(
        boundary.database.insert(userKillCharacterTable).values({
          discordUserId: "discord-1",
          world: "tempest",
          characterId: "character-1",
          name: "Reported Hero",
          kills: 1,
          firstKilledAt: new Date("2026-10-30T10:00:00Z"),
          lastKilledAt: new Date("2026-10-30T10:00:00Z"),
        }),
      );

      const pickAs = (characterId: string, characterName: string) =>
        boundary.run(
          Effect.gen(function* () {
            yield* TestClock.setTime(Date.parse(war.startsAt) + 60_000);

            return yield* pickFaction(war.id, {
              faction: "BARBATOS",
              characterId,
              characterName,
              world: "tempest",
            });
          }).pipe(
            Effect.provide(
              Layer.mergeAll(
                FactionWarsData.layerDatabase,
                identityOf("user-1", "discord-1"),
                TestClock.layer(),
              ),
            ),
          ),
        );

      await expect(pickAs("someone-else", "Rival")).rejects.toThrow();

      const picked = await pickAs("character-1", "Spoofed Name");

      expect(picked.pick).toMatchObject({
        characterName: "Reported Hero",
        hiddenFromLeaderboard: true,
      });

      const leaderboard = await boundary.run(
        Effect.gen(function* () {
          yield* TestClock.setTime(Date.parse(war.startsAt) + 60_000);

          return yield* getFactionWarLeaderboard(war.id, "BARBATOS");
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              FactionWarsData.layerDatabase,
              identityOf("user-2", "discord-2"),
              TestClock.layer(),
            ),
          ),
        ),
      );

      expect(leaderboard.entries).toEqual([
        expect.objectContaining({ characterName: null, world: null }),
      ]);
    } finally {
      await boundary.dispose();
    }
  });

  it("highlight only the picking character, not the champion's other characters", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const characterIds = await boundary.run(
        Effect.gen(function* () {
          const data = yield* FactionWarsData;

          yield* data.createPick(pick("user-1", "discord-1"));
          yield* boundary.database.insert(userKillCharacterTable).values({
            discordUserId: "discord-1",
            world: "tempest",
            characterId: "alt-on-another-account",
            name: "Alt",
            kills: 3,
            firstKilledAt: new Date("2026-10-20T10:00:00Z"),
            lastKilledAt: new Date("2026-10-20T10:00:00Z"),
          });

          const rows = yield* data.championCharacterIds(
            "2026-barbatos-tanroth",
            ["BARBATOS"],
            "tempest",
          );

          return rows.map((row) => row.characterId);
        }).pipe(Effect.provide(FactionWarsData.layerDatabase)),
      );

      expect(characterIds).toEqual(["character-user-1"]);
    } finally {
      await boundary.dispose();
    }
  });
});
