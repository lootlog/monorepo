import { afterEach, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { makeUserAccountDeletion } from "../account-organization/user-account-deletion.data-layer.js";
import { recordMargonemAccountVerification } from "#src/margonem-accounts/margonem-accounts";
import type {
  CharacterAuraId,
  CharacterAurasChanged,
} from "@lootlog/schema/character-aura";
import type { CharacterAurasResponse } from "#src/contracts/character-auras/schemas";
import {
  makeCharacterAurasData,
  type CharacterAuraHolders,
} from "./character-auras.data-layer.js";

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

// The `index`th character on a Margonem account.
const character = (gameAccountId: string, index = 1) => ({
  gameAccountId,
  characterId: `${gameAccountId}0${index}`,
});

// What a list shows on the `index`th character of the account.
const shown = <A extends CharacterAuraId | null>(
  gameAccountId: string,
  auraId: A,
  index = 1,
) => ({
  ...character(gameAccountId, index),
  auraId,
});

describe("character auras", () => {
  it("refuses an aura to a User without access but lets them remove one", async () => {
    const { run, verify } = await setup(["admin"]);

    await verify("player", "101");

    const refused = await run((data) =>
      Effect.flip(data.updateOwnAura("player", character("101"), "frost")),
    );

    expect(refused._tag).toBe("CharacterAuraAccessDenied");

    const removed = await run((data) =>
      data.updateOwnAura("player", character("101"), null),
    );

    expect(removed).toEqual({ auras: [], canChange: false, canGrant: false });
  });

  it("shows an aura only on the character it was chosen for, and only while its User has access", async () => {
    const admin = await setup(["admin"]);

    await admin.verify("admin", "101");
    await admin.verify("admin", "202");
    await admin.run((data) =>
      Effect.all([
        data.updateOwnAura("admin", character("101"), "frost"),
        data.updateOwnAura("admin", character("202", 2), "tide"),
      ]),
    );

    // The other characters of the same User, on either account, show none.
    expect(await admin.run((data) => data.getAuras())).toEqual({
      auras: [shown("101", "frost"), shown("202", "tide", 2)],
    });
    expect((await admin.run((data) => data.getOwnAura("admin"))).auras).toEqual(
      [shown("101", "frost"), shown("202", "tide", 2)],
    );

    // The same stored choices under a configuration that dropped the admin.
    const revoked = await admin.boundary.run(
      Effect.flatMap(makeCharacterAurasData([], admin.events), (data) =>
        data.getAuras(),
      ),
    );

    expect(revoked).toEqual({ auras: [] });
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
      Effect.flip(data.updateOwnAura("player", character("101"), "sovereign")),
    );

    expect(refused._tag).toBe("CharacterAuraAccessDenied");

    await admin.run((data) =>
      data.updateOwnAura("admin", character("202"), "sovereign"),
    );

    expect(await admin.run((data) => data.getAuras())).toEqual({
      auras: [shown("202", "sovereign")],
    });

    // Dropped from the admins, the grant alone does not keep it showing.
    const dropped = await admin.boundary.run(
      Effect.flatMap(makeCharacterAurasData([], admin.events), (data) =>
        data.getAuras(),
      ),
    );

    expect(dropped).toEqual({ auras: [] });
  });

  it("shows a shared account's characters with the auras of the User who proved it last, whatever order the proofs arrive in", async () => {
    const { run, verify } = await setup(["first", "second"]);

    await verify("first", "101", 0);
    await verify("second", "101", 0);
    await run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("first", character("101"), "hellfire");
        yield* data.updateOwnAura("second", character("101", 2), "sakura");
      }),
    );
    await verify("second", "101", 5);
    // A late redelivery of an older proof does not take the account back.
    await verify("first", "101", 1);
    await verify("second", "101", 2);

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [shown("101", "sakura", 2)],
    });

    // Choosing for a character another User chose for takes it over.
    await run((data) =>
      data.updateOwnAura("second", character("101"), "frost"),
    );

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [shown("101", "frost"), shown("101", "sakura", 2)],
    });
    expect((await run((data) => data.getOwnAura("first"))).auras).toEqual([]);

    await run((data) =>
      Effect.all([
        data.updateOwnAura("second", character("101"), null),
        data.updateOwnAura("second", character("101", 2), null),
      ]),
    );

    expect(await run((data) => data.getAuras())).toEqual({ auras: [] });
  });

  it("refuses an aura for a character on an account its User did not prove to play", async () => {
    const { run, verify } = await setup(["admin"]);

    await verify("victim", "101");

    const refused = await run((data) =>
      Effect.flip(data.updateOwnAura("admin", character("101"), "frost")),
    );

    expect(refused._tag).toBe("CharacterAuraAccessDenied");
    expect(await run((data) => data.getAuras())).toEqual({ auras: [] });
  });

  it("lets an admin grant auras to the User who plays an account, and revoking removes the auras they chose", async () => {
    const { run, verify } = await setup(["admin"]);

    await verify("player", "101");
    await verify("admin", "202");
    await run((data) => data.updateOwnAura("admin", character("202"), "void"));

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
    await run((data) =>
      Effect.all([
        data.updateOwnAura("player", character("101"), "frost"),
        data.updateOwnAura("player", character("101", 2), "tide"),
      ]),
    );

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [
        shown("101", "frost"),
        shown("101", "tide", 2),
        shown("202", "void"),
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
      auras: [shown("202", "void")],
    });
    expect(await run((data) => data.getOwnAura("player"))).toEqual({
      auras: [],
      canChange: false,
      canGrant: false,
    });

    const regranted = await run((data) =>
      Effect.flatMap(data.grantAuras("admin", "101"), () =>
        data.getOwnAura("player"),
      ),
    );

    // A new grant does not bring the removed auras back.
    expect(regranted).toEqual({ auras: [], canChange: true, canGrant: false });
  });

  it("serves stored reads until a write changes who shows which aura", async () => {
    const { boundary, events, verify } = await setup(["admin"]);

    await verify("admin", "202");
    await verify("player", "101");

    // Keeps each read until told to forget it, as the shared cache does.
    let list: CharacterAurasResponse | undefined;
    let holders: CharacterAuraHolders | undefined;

    const lists = () =>
      boundary.run(
        Effect.flatMap(
          makeCharacterAurasData(["admin"], events, {
            list: (load) =>
              list
                ? Effect.succeed(list)
                : Effect.tap(load, (loaded) =>
                    Effect.sync(() => void (list = loaded)),
                  ),
            holders: (load) =>
              holders
                ? Effect.succeed(holders)
                : Effect.tap(load, (loaded) =>
                    Effect.sync(() => void (holders = loaded)),
                  ),
            invalidate: Effect.sync(() => {
              list = undefined;
              holders = undefined;
            }),
          }),
          (data) =>
            Effect.gen(function* () {
              const see = Effect.all([
                Effect.map(data.getAuras(), ({ auras }) => auras),
                Effect.map(
                  data.getOwnAura("player"),
                  ({ auras, canChange }) => ({ auras, canChange }),
                ),
              ]);

              const seen = [yield* see];

              yield* data.updateOwnAura("admin", character("202"), "void");
              seen.push(yield* see);
              yield* data.grantAuras("admin", "101");
              seen.push(yield* see);
              yield* data.updateOwnAura("player", character("101"), "frost");
              seen.push(yield* see);
              yield* data.revokeAuras("admin", "101");
              seen.push(yield* see);
              yield* data.updateOwnAura("admin", character("202"), null);
              seen.push(yield* see);

              return seen;
            }),
        ),
      );

    const none = { auras: [], canChange: false };
    const granted = { auras: [], canChange: true };

    expect(await lists()).toEqual([
      [[], none],
      [[shown("202", "void")], none],
      [[shown("202", "void")], granted],
      [
        [shown("101", "frost"), shown("202", "void")],
        { auras: [shown("101", "frost")], canChange: true },
      ],
      [[shown("202", "void")], none],
      [[], none],
    ]);
  });

  it("tells Game clients what each changed character shows now", async () => {
    const { announced, run, verify } = await setup(["admin"]);

    await verify("admin", "101");
    await verify("player", "303");

    await run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("admin", character("101"), "frost");
        yield* data.grantAuras("admin", "303");
        yield* data.updateOwnAura("player", character("303"), "tide");
        yield* data.updateOwnAura("player", character("303", 2), "venom");
        yield* data.revokeAuras("admin", "303");
        // An admin keeps theirs, so nothing changes on their characters.
        yield* data.revokeAuras("admin", "101");
        // Removing an aura the character does not wear announces nothing.
        yield* data.updateOwnAura("admin", character("101", 2), null);
        yield* data.updateOwnAura("admin", character("101"), null);
      }),
    );

    expect(announced).toEqual([
      { auras: [shown("101", "frost")] },
      { auras: [shown("303", "tide")] },
      { auras: [shown("303", "venom", 2)] },
      { auras: [shown("303", null), shown("303", null, 2)] },
      { auras: [shown("101", null)] },
    ]);
  });

  it("announces no aura for a character whose account another User plays now", async () => {
    const { announced, run, verify } = await setup(["first", "second"]);

    await verify("first", "101", 0);
    await verify("second", "101", 1);
    await run((data) => data.updateOwnAura("first", character("101"), "frost"));

    expect(announced).toEqual([{ auras: [shown("101", null)] }]);
  });

  it("keeps a chosen aura when the broker cannot announce it", async () => {
    const { run, verify } = await setup(["admin"], { brokerDown: true });

    await verify("admin", "101");
    await run((data) => data.updateOwnAura("admin", character("101"), "frost"));

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [shown("101", "frost")],
    });
  });

  it("removes the auras and their accounts with the Lootlog account", async () => {
    const { boundary, run, verify } = await setup(["admin", "other"]);

    await verify("admin", "101");
    await verify("other", "202");
    await verify("granted", "303");
    await run((data) =>
      Effect.gen(function* () {
        yield* data.updateOwnAura("admin", character("101"), "void");
        yield* data.updateOwnAura("other", character("202"), "tide");
      }),
    );
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
      auras: [shown("202", "tide")],
    });
  });
});
