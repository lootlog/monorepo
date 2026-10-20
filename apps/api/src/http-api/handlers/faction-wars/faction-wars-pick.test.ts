import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { FactionWarsData } from "./faction-wars.handlers.js";

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
});
