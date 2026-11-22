import { fixedRoleHolders } from "#src/platform-roles/role-holders";
import { afterEach, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { makeUserAccountDeletion } from "#src/users/user-account-deletion.data-layer";
import { recordMargonemAccountVerification } from "#src/users/margonem-accounts";
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

  const announced: CharacterAurasChanged[] = [];

  const events = {
    publishChanged: (change: CharacterAurasChanged) =>
      brokerDown
        ? Effect.fail(new Error("broker down"))
        : Effect.sync(() => void announced.push(change)),
  };

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
          makeCharacterAurasData(fixedRoleHolders(entitledUserIds), events),
          operation,
        ),
      ),
  };
};

const character = (gameAccountId: string, index = 1) => ({
  gameAccountId,
  characterId: `${gameAccountId}0${index}`,
});

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

    expect(removed).toEqual({
      auras: [],
      canChange: false,
      personalAuraIds: [],
      canGrant: false,
    });
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

    expect(await admin.run((data) => data.getAuras())).toEqual({
      auras: [shown("101", "frost"), shown("202", "tide", 2)],
    });
    expect((await admin.run((data) => data.getOwnAura("admin"))).auras).toEqual(
      [shown("101", "frost"), shown("202", "tide", 2)],
    );

    const revoked = await admin.boundary.run(
      Effect.flatMap(
        makeCharacterAurasData(fixedRoleHolders([]), admin.events),
        (data) => data.getAuras(),
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

    const dropped = await admin.boundary.run(
      Effect.flatMap(
        makeCharacterAurasData(fixedRoleHolders([]), admin.events),
        (data) => data.getAuras(),
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
    await verify("first", "101", 1);
    await verify("second", "101", 2);

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [shown("101", "sakura", 2)],
    });

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
        Effect.flip(data.getGrants("player", "101")),
        Effect.flip(data.getGrants("admin", "999")),
      ]),
    );

    expect(refused.map((error) => error._tag)).toEqual([
      "CharacterAuraAccessDenied",
      "CharacterAuraGrantTargetNotFound",
      "CharacterAuraAccessDenied",
      "CharacterAuraGrantTargetNotFound",
    ]);

    const grantsOf101 = () => run((data) => data.getGrants("admin", "101"));

    expect(await grantsOf101()).toEqual({
      userId: "player",
      admin: false,
      granted: false,
      personalAuraIds: [],
    });

    await run((data) =>
      Effect.all([
        data.grantAuras("admin", "101"),
        data.grantPersonalAura("admin", "101", "joker"),
      ]),
    );

    expect(await grantsOf101()).toEqual({
      userId: "player",
      admin: false,
      granted: true,
      personalAuraIds: ["joker"],
    });
    expect(await run((data) => data.listGrantHolders("admin"))).toEqual({
      holders: [
        { userId: "player", granted: true, personalAuraIds: ["joker"] },
      ],
    });
    expect(
      (await run((data) => Effect.flip(data.listGrantHolders("player"))))._tag,
    ).toBe("CharacterAuraAccessDenied");
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

    await run((data) =>
      Effect.all([
        data.revokeAuras("admin", "101"),
        data.revokeAuras("admin", "202"),
      ]),
    );

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [shown("202", "void")],
    });
    expect(await grantsOf101()).toEqual({
      userId: "player",
      admin: false,
      granted: false,
      personalAuraIds: [],
    });
    expect(await run((data) => data.listGrantHolders("admin"))).toEqual({
      holders: [],
    });
    expect(await run((data) => data.getOwnAura("player"))).toEqual({
      auras: [],
      canChange: false,
      personalAuraIds: [],
      canGrant: false,
    });

    const regranted = await run((data) =>
      Effect.flatMap(data.grantAuras("admin", "101"), () =>
        data.getOwnAura("player"),
      ),
    );

    expect(regranted).toEqual({
      auras: [],
      canChange: true,
      personalAuraIds: [],
      canGrant: false,
    });
  });

  it("keeps a personal aura to the User it was granted to, whatever else they may choose", async () => {
    const { run, verify } = await setup(["admin"]);

    await verify("granted", "101");
    await verify("holder", "202");
    await run((data) =>
      Effect.all([
        data.grantAuras("admin", "101"),
        data.grantPersonalAura("admin", "202", "skyborne"),
      ]),
    );

    const refused = await run((data) =>
      Effect.all([
        Effect.flip(
          data.updateOwnAura("granted", character("101"), "skyborne"),
        ),
        Effect.flip(data.updateOwnAura("holder", character("202"), "joker")),
        Effect.flip(data.updateOwnAura("holder", character("202"), "frost")),
        Effect.flip(data.grantPersonalAura("holder", "101", "skyborne")),
      ]),
    );

    expect(refused.map((error) => error._tag)).toEqual([
      "CharacterAuraAccessDenied",
      "CharacterAuraAccessDenied",
      "CharacterAuraAccessDenied",
      "CharacterAuraAccessDenied",
    ]);

    const chosen = await run((data) =>
      data.updateOwnAura("holder", character("202"), "skyborne"),
    );

    expect(chosen).toEqual({
      auras: [shown("202", "skyborne")],
      canChange: false,
      personalAuraIds: ["skyborne"],
      canGrant: false,
    });
    expect(await run((data) => data.getAuras())).toEqual({
      auras: [shown("202", "skyborne")],
    });

    await run((data) => data.revokeAuras("admin", "202"));

    expect(await run((data) => data.getAuras())).toEqual({ auras: [] });
    expect(
      (await run((data) => data.getOwnAura("holder"))).personalAuraIds,
    ).toEqual([]);
  });

  it("serves stored reads until a write changes who shows which aura", async () => {
    const { boundary, events, verify } = await setup(["admin"]);

    await verify("admin", "202");
    await verify("player", "101");

    let list: CharacterAurasResponse | undefined;
    let holders: CharacterAuraHolders | undefined;

    const lists = () =>
      boundary.run(
        Effect.flatMap(
          makeCharacterAurasData(fixedRoleHolders(["admin"]), events, {
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
        yield* data.revokeAuras("admin", "101");
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

    expect((await run((data) => data.getOwnAura("granted"))).canChange).toBe(
      false,
    );

    expect(await run((data) => data.getAuras())).toEqual({
      auras: [shown("202", "tide")],
    });
  });
});
