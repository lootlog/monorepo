import { afterEach, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { makeUserAccountDeletion } from "../account-organization/user-account-deletion.data-layer.js";
import { recordMargonemAccountVerification } from "#src/margonem-accounts/margonem-accounts";
import type { CharacterAurasChanged } from "@lootlog/schema/character-aura";
import { makeCharacterAurasData } from "./character-auras.data-layer.js";

const boundaries: Array<Awaited<ReturnType<typeof createDatabaseBoundary>>> =
  [];

afterEach(async () => {
  await Promise.all(boundaries.splice(0).map((boundary) => boundary.dispose()));
});

const setup = async (
  entitledUserIds: ReadonlyArray<string>,
  { brokerDown = false } = {},
) => {
  const boundary = await createDatabaseBoundary();
  boundaries.push(boundary);

  // What every Game client was told, in order.
  const announced: CharacterAurasChanged[] = [];

  const events = {
    publishChanged: (change: CharacterAurasChanged) =>
      brokerDown
        ? Effect.fail(new Error("broker down"))
        : Effect.sync(() => void announced.push(change)),
  };

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
    announced,
    boundary,
    verify,
    events,
    run: <A, E>(
      operation: (
        data: Effect.Success<ReturnType<typeof makeCharacterAurasData>>,
      ) => Effect.Effect<A, E>,
    ) =>
      boundary.run(
        Effect.flatMap(
          makeCharacterAurasData(entitledUserIds, events),
          operation,
        ),
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
      canGrant: false,
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
      Effect.flatMap(makeCharacterAurasData([], admin.events), (data) =>
        Effect.all([
          data.getAuras(),
          Effect.flip(data.linkGameAccount("admin", "303")),
        ]),
      ),
    );

    expect(revoked[0]).toEqual({ auras: [] });
    expect(revoked[1]._tag).toBe("CharacterAuraAccessDenied");
  });

  it("keeps admin auras to admins, even for granted Users", async () => {
    const admin = await setup(["admin"]);

    await admin.verify("player", "101");
    await admin.verify("admin", "202");
    await admin.run((data) =>
      Effect.all([
        data.grantAuras("admin", "101"),
        data.grantAuras("admin", "202"),
      ]),
    );

    const refused = await admin.run((data) =>
      Effect.flip(data.updateOwnAura("player", "sovereign")),
    );

    expect(refused._tag).toBe("CharacterAuraAccessDenied");

    await admin.run((data) => data.updateOwnAura("admin", "sovereign"));

    expect(await admin.run((data) => data.getAuras())).toEqual({
      auras: [{ gameAccountId: "202", auraId: "sovereign" }],
    });

    // Dropped from the admins, the grant alone does not keep it showing.
    const dropped = await admin.boundary.run(
      Effect.flatMap(makeCharacterAurasData([], admin.events), (data) =>
        data.getAuras(),
      ),
    );

    expect(dropped).toEqual({ auras: [] });
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

  it("lets an admin grant auras to the User who plays an account, and revoking removes the aura they wear", async () => {
    const { run, verify } = await setup(["admin"]);

    await verify("player", "101");
    await verify("admin", "202");
    await run((data) => data.updateOwnAura("admin", "void"));

    const refused = await run((data) =>
      Effect.all([
        Effect.flip(data.grantAuras("player", "101")),
        Effect.flip(data.grantAuras("admin", "999")),
      ]),
    );

    expect(refused.map((error) => error._tag)).toEqual([
      "CharacterAuraAccessDenied",
      "CharacterAuraGrantTargetNotFound",
    ]);

    await run((data) => data.grantAuras("admin", "101"));
    await run((data) => data.updateOwnAura("player", "frost"));

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [
        { gameAccountId: "101", auraId: "frost" },
        { gameAccountId: "202", auraId: "void" },
      ],
    });

    // Revoking an admin's own account takes nothing from them.
    await run((data) =>
      Effect.all([
        data.revokeAuras("admin", "101"),
        data.revokeAuras("admin", "202"),
      ]),
    );

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [{ gameAccountId: "202", auraId: "void" }],
    });
    expect(await run((data) => data.getOwnAura("player"))).toEqual({
      auraId: null,
      canChange: false,
      canGrant: false,
      gameAccountIds: [],
    });

    const regranted = await run((data) =>
      Effect.flatMap(data.grantAuras("admin", "101"), () =>
        data.getOwnAura("player"),
      ),
    );

    // A new grant does not bring the removed aura back.
    expect(regranted).toEqual({
      auraId: null,
      canChange: true,
      canGrant: false,
      gameAccountIds: [],
    });
  });

  it("tells Game clients each change of an aura on the accounts it shows on", async () => {
    const { announced, run, verify } = await setup(["admin"]);

    await verify("admin", "101");
    await verify("admin", "202");
    await verify("player", "303");

    await run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("admin", "frost");
        yield* data.grantAuras("admin", "303");
        yield* data.updateOwnAura("player", "tide");
        yield* data.revokeAuras("admin", "303");
        // An admin keeps theirs, so nothing changes on their accounts.
        yield* data.revokeAuras("admin", "101");
        yield* data.updateOwnAura("admin", null);
      }),
    );

    expect(announced).toEqual([
      {
        auras: [
          { gameAccountId: "101", auraId: "frost" },
          { gameAccountId: "202", auraId: "frost" },
        ],
      },
      { auras: [{ gameAccountId: "303", auraId: "tide" }] },
      { auras: [{ gameAccountId: "303", auraId: null }] },
      {
        auras: [
          { gameAccountId: "101", auraId: null },
          { gameAccountId: "202", auraId: null },
        ],
      },
    ]);
  });

  it("keeps a chosen aura when the broker cannot announce it", async () => {
    const { run, verify } = await setup(["admin"], { brokerDown: true });

    await verify("admin", "101");
    await run((data) => data.updateOwnAura("admin", "frost"));

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [{ gameAccountId: "101", auraId: "frost" }],
    });
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
    await verify("granted", "303");
    await run((data) => data.grantAuras("admin", "303"));

    const deleteAccount = (userId: string) =>
      boundary.run(
        makeUserAccountDeletion(boundary.database, {
          cleanupBattlelog: () => Effect.void,
          deleteCacheKey: () => Effect.void,
          invalidateCacheScopes: () => Effect.void,
          deleteCachePattern: () => Effect.void,
          publishMemberRemoved: () => Effect.void,
        })({ userId, discordId: `${userId}-discord` }),
      );

    await deleteAccount("admin");
    await deleteAccount("granted");

    // A new account under the same id starts without the grant.
    expect((await run((data) => data.getOwnAura("granted"))).canChange).toBe(
      false,
    );

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [{ gameAccountId: "202", auraId: "tide" }],
    });
  });
});
