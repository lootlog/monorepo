import { afterEach, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { makeUserAccountDeletion } from "../account-organization/user-account-deletion.data-layer.js";
import { recordMargonemAccountVerification } from "#src/margonem-accounts/margonem-accounts";
import { makeCharacterAurasData } from "./character-auras.data-layer.js";

const boundaries: Array<Awaited<ReturnType<typeof createDatabaseBoundary>>> =
  [];

afterEach(async () => {
  await Promise.all(boundaries.splice(0).map((boundary) => boundary.dispose()));
});

const setup = async (entitledUserIds: ReadonlyArray<string>) => {
  const boundary = await createDatabaseBoundary();
  boundaries.push(boundary);

  // The gateway's fact that the User proved to play the account at `minute`.
  const verify = (userId: string, accountId: string, minute = 0) =>
    boundary.run(
      recordMargonemAccountVerification(boundary.database, {
        version: 1,
        userId,
        accountId,
        characterId: `${accountId}-character`,
        world: "tempest",
        verifiedAt: new Date(Date.UTC(2026, 10, 2, 10, minute)).toISOString(),
      }),
    );

  return {
    boundary,
    verify,
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

    await admin.run((data) => data.updateOwnAura("admin", "frost"));
    await admin.verify("admin", "101");
    await admin.verify("admin", "202");

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

  it("shows an account with the aura of the User who proved it last, whatever order the proofs arrive in", async () => {
    const { run, verify } = await setup(["first", "second"]);

    await run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("first", "hellfire");
        yield* data.updateOwnAura("second", "sakura");
      }),
    );
    await verify("second", "101", 5);
    // A late redelivery of an older proof does not take the account back.
    await verify("first", "101", 1);
    await verify("second", "101", 2);

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [{ gameAccountId: "101", auraId: "sakura" }],
    });
    expect(
      (await run((data) => data.getOwnAura("first"))).gameAccountIds,
    ).toEqual([]);

    await run((data) => data.updateOwnAura("second", null));

    // The account is played by a User without an aura now.
    expect(await run((data) => data.getAuras())).toEqual({ auras: [] });
  });

  it("never shows an aura on an account its User did not prove to play", async () => {
    const { run, verify } = await setup(["admin"]);

    await run((data) => data.updateOwnAura("admin", "frost"));
    await verify("victim", "101");

    // Older Game clients still claim accounts; the claim changes nothing.
    await run((data) => data.linkGameAccount("admin", "101"));

    expect(await run((data) => data.getAuras())).toEqual({ auras: [] });
    expect(
      (await run((data) => data.getOwnAura("admin"))).gameAccountIds,
    ).toEqual([]);
  });

  it("removes the aura and its accounts with the Lootlog account", async () => {
    const { boundary, run, verify } = await setup(["admin", "other"]);

    await run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("admin", "void");
        yield* data.updateOwnAura("other", "tide");
      }),
    );
    await verify("admin", "101");
    await verify("other", "202");

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
