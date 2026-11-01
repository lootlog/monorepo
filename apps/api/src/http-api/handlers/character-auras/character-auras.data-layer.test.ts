import { afterEach, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { makeUserAccountDeletion } from "../account-organization/user-account-deletion.data-layer.js";
import { makeCharacterAurasData } from "./character-auras.data-layer.js";

const boundaries: Array<Awaited<ReturnType<typeof createDatabaseBoundary>>> =
  [];

afterEach(async () => {
  await Promise.all(boundaries.splice(0).map((boundary) => boundary.dispose()));
});

const setup = async (entitledUserIds: ReadonlyArray<string>) => {
  const boundary = await createDatabaseBoundary();
  boundaries.push(boundary);

  return {
    boundary,
    run: <A, E>(
      operation: (
        data: Effect.Success<ReturnType<typeof makeCharacterAurasData>>,
      ) => Effect.Effect<A, E>,
    ) =>
      boundary.run(
        Effect.flatMap(makeCharacterAurasData(entitledUserIds), operation),
      ),
  };
};

describe("character auras", () => {
  it("refuses an aura to a User without access but lets them remove one", async () => {
    const { run } = await setup(["admin"]);

    const refused = await run((data) =>
      Effect.flip(data.updateOwnAura("player", "frost")),
    );

    expect(refused._tag).toBe("CharacterAuraAccessDenied");

    const removed = await run((data) => data.updateOwnAura("player", null));

    expect(removed).toEqual({
      auraId: null,
      canChange: false,
      gameAccountIds: [],
    });
  });

  it("shows an aura on every account its User plays, and only while they have access", async () => {
    const admin = await setup(["admin"]);

    await admin.run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("admin", "frost");
        yield* data.linkGameAccount("admin", "101");
        yield* data.linkGameAccount("admin", "202");
      }),
    );

    expect(await admin.run((data) => data.getAuras())).toEqual({
      auras: [
        { gameAccountId: "101", auraId: "frost" },
        { gameAccountId: "202", auraId: "frost" },
      ],
    });

    // The same stored choice under a configuration that dropped the admin.
    const revoked = await admin.boundary.run(
      Effect.flatMap(makeCharacterAurasData([]), (data) =>
        Effect.all([
          data.getAuras(),
          Effect.flip(data.linkGameAccount("admin", "303")),
        ]),
      ),
    );

    expect(revoked[0]).toEqual({ auras: [] });
    expect(revoked[1]._tag).toBe("CharacterAuraAccessDenied");
  });

  it("moves an account to the User who played it last and drops it with the aura", async () => {
    const { run } = await setup(["first", "second"]);

    await run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("first", "hellfire");
        yield* data.linkGameAccount("first", "101");
        yield* data.updateOwnAura("second", "sakura");
        yield* data.linkGameAccount("second", "101");
      }),
    );

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [{ gameAccountId: "101", auraId: "sakura" }],
    });
    expect(
      (await run((data) => data.getOwnAura("first"))).gameAccountIds,
    ).toEqual([]);

    await run((data) => data.updateOwnAura("second", null));

    expect(await run((data) => data.getAuras())).toEqual({ auras: [] });
  });

  it("refuses to show an aura on an account while the User wears none", async () => {
    const { run } = await setup(["admin"]);

    const refused = await run((data) =>
      Effect.flip(data.linkGameAccount("admin", "101")),
    );

    expect(refused._tag).toBe("CharacterAuraAccessDenied");
  });

  it("removes the aura and its accounts with the Lootlog account", async () => {
    const { boundary, run } = await setup(["admin", "other"]);

    await run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("admin", "void");
        yield* data.linkGameAccount("admin", "101");
        yield* data.updateOwnAura("other", "tide");
        yield* data.linkGameAccount("other", "202");
      }),
    );

    await boundary.run(
      makeUserAccountDeletion(boundary.database, {
        cleanupBattlelog: () => Effect.void,
        deleteCacheKey: () => Effect.void,
        invalidateCacheScopes: () => Effect.void,
        deleteCachePattern: () => Effect.void,
        publishMemberRemoved: () => Effect.void,
      })({ userId: "admin", discordId: "admin-discord" }),
    );

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [{ gameAccountId: "202", auraId: "tide" }],
    });
  });
});
