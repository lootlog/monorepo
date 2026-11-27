import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { inArray } from "drizzle-orm";
import { Effect, Layer, ManagedRuntime } from "effect";
import { USER_PLANS } from "../src/plans/plan-catalog.js";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import { userEquipmentSetTable } from "../src/database/drizzle/equipment-set.schema.js";
import { makeUserAccountDeletion } from "../src/users/user-account-deletion.data-layer.js";
import {
  UserEquipmentSetLimitReached,
  UserEquipmentSetNotFound,
  UserEquipmentSetsData,
} from "../src/users/user-equipment-sets-data.js";
import {
  createUserEquipmentSet,
  deleteUserEquipmentSet,
  getUserEquipmentSets,
  updateUserEquipmentSet,
  UserEquipmentSetsIdentity,
} from "../src/http-api/handlers/user-equipment-sets/user-equipment-sets.handlers.js";

const EQUIPMENT_SET_LIMIT = USER_PLANS.free.equipmentSets;

const runtime = ManagedRuntime.make(
  UserEquipmentSetsData.layerDatabase.pipe(Layer.provideMerge(ApiDatabaseLive)),
);

const owner = "user-equipment-sets-owner";

const stranger = "user-equipment-sets-stranger";

const code = "w120_w1234u5_h99";

type Requirements =
  | UserEquipmentSetsData
  | UserEquipmentSetsIdentity
  | ForwardAuthIdentity;

const as = <A, E>(userId: string, effect: Effect.Effect<A, E, Requirements>) =>
  runtime.runPromise(
    effect.pipe(
      Effect.provideService(
        UserEquipmentSetsIdentity,
        UserEquipmentSetsIdentity.of({ userId: Effect.succeed(userId) }),
      ),
      Effect.provideService(ForwardAuthIdentity, {
        userId,
        discordId: `discord-${userId}`,
      }),
    ),
  );

const failureOf = <A, E>(
  userId: string,
  effect: Effect.Effect<A, E, Requirements>,
) => as(userId, Effect.flip(effect));

const create = (userId: string, name = "Wojownik 120") =>
  as(userId, createUserEquipmentSet({ name, code }));

describe("User equipment sets against migrated PostgreSQL", () => {
  beforeEach(async () => {
    await runtime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        db
          .delete(userEquipmentSetTable)
          .where(inArray(userEquipmentSetTable.userId, [owner, stranger])),
      ),
    );
  });
  afterAll(async () => {
    await runtime.dispose();
  });

  it("enforces the plan limit even when saves race", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: EQUIPMENT_SET_LIMIT + 3 }, (_, index) =>
        create(owner, `Zestaw ${index}`),
      ),
    );

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      EQUIPMENT_SET_LIMIT,
    );

    const failure = await failureOf(
      owner,
      createUserEquipmentSet({ name: "x", code }),
    );

    expect(failure).toBeInstanceOf(UserEquipmentSetLimitReached);
    expect(failure).toMatchObject({ equipmentSetLimit: EQUIPMENT_SET_LIMIT });
    expect(await create(stranger)).toMatchObject({ name: "Wojownik 120" });
  });

  it("edits the nick, description and contents of a set independently", async () => {
    const saved = await create(owner, "Przeciwnik");

    await as(owner, updateUserEquipmentSet(saved.id, { name: "Mag 200" }));
    await as(
      owner,
      updateUserEquipmentSet(saved.id, { description: "Na Kaczora" }),
    );
    await as(owner, updateUserEquipmentSet(saved.id, { code: "m200_w55" }));

    expect(await as(owner, getUserEquipmentSets())).toEqual([
      expect.objectContaining({
        id: saved.id,
        name: "Mag 200",
        description: "Na Kaczora",
        code: "m200_w55",
      }),
    ]);
  });

  it("hides one User's set from every operation of another", async () => {
    const saved = await create(owner);

    expect(await as(stranger, getUserEquipmentSets())).toEqual([]);

    const operations: ReadonlyArray<
      Effect.Effect<unknown, unknown, Requirements>
    > = [
      updateUserEquipmentSet(saved.id, { name: "Przejęty", code: "-" }),
      deleteUserEquipmentSet(saved.id),
    ];

    for (const operation of operations) {
      expect(await failureOf(stranger, operation)).toBeInstanceOf(
        UserEquipmentSetNotFound,
      );
    }

    expect(await as(owner, getUserEquipmentSets())).toEqual([
      expect.objectContaining({ id: saved.id, name: "Wojownik 120", code }),
    ]);
  });

  it("removes the account's sets with the account", async () => {
    await create(owner);
    const kept = await create(stranger);

    await runtime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        makeUserAccountDeletion(db, {
          requestBattlelogDeletion: () => Effect.void,
          deleteCacheKey: () => Effect.void,
          invalidateCacheScopes: () => Effect.void,
          deleteCachePattern: () => Effect.void,
          publishMemberRemoved: () => Effect.void,
        })({ userId: owner, discordId: "user-equipment-sets-owner-discord" }),
      ),
    );

    expect(await as(owner, getUserEquipmentSets())).toEqual([]);
    expect(await as(stranger, getUserEquipmentSets())).toEqual([
      expect.objectContaining({ id: kept.id }),
    ]);
  });
});
