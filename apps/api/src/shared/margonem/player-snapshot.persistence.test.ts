import { describe, expect, test } from "bun:test";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { playerSnapshotTable } from "#src/database/drizzle/schema";
import {
  parseCharacterIdentity,
  resolvePlayerSnapshots,
} from "./player-snapshot.persistence.js";

const character = {
  world: "nomada",
  accountId: 7914705,
  characterId: 357150,
  name: "Pervor Mag",
  prof: "MAGE",
} as const;

describe("resolvePlayerSnapshots", () => {
  test("stores a character without a graphic once, however the sender reported it", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;

      // A row written by an earlier sender that stored the empty string.
      await run(
        database.insert(playerSnapshotTable).values({
          ...character,
          snapshotHash: "legacy",
          icon: "",
        }),
      );

      const resolved = await run(
        resolvePlayerSnapshots(database, [
          { ...character, icon: null },
          { ...character, icon: "  " },
          { ...character, icon: "" },
        ]),
      );

      const rows = await run(database.select().from(playerSnapshotTable));

      expect(rows).toHaveLength(1);
      expect(new Set(resolved.map(({ id }) => id))).toEqual(
        new Set([rows[0]?.id]),
      );
    } finally {
      await boundary.dispose();
    }
  });
});

describe("parseCharacterIdentity", () => {
  test("keeps a character id ending in zero when the account is unknown", () => {
    expect(parseCharacterIdentity(357150, 0)).toEqual({
      accountId: 0,
      characterId: 357150,
    });
    expect(parseCharacterIdentity("357150", "")).toEqual({
      accountId: 0,
      characterId: 357150,
    });
  });

  test("removes the account id older clients appended to the character id", () => {
    expect(parseCharacterIdentity(3571507914705, 7914705)).toEqual({
      accountId: 7914705,
      characterId: 357150,
    });
    expect(parseCharacterIdentity("357150", "7914705")).toEqual({
      accountId: 7914705,
      characterId: 357150,
    });
  });

  test("rejects a character id that is not a positive integer", () => {
    expect(parseCharacterIdentity("abc", "7914705")).toBeNull();
    expect(parseCharacterIdentity(0, 7914705)).toBeNull();
  });
});
