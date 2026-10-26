import { createHash } from "node:crypto";
import { findFinishingBlows } from "@lootlog/battle-processor";
import { and, count, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { BattleReadBudget } from "#src/database/battle-read-budget";
import type { DrizzleDatabase } from "#src/database/database";
import { weaponKills } from "#src/database/schema";
import { CreateBattleSchema } from "#src/battles/submission/create-battle";

const MargonemId = Schema.String.check(Schema.isPattern(/^\d{1,20}$/));

export const RecordWeaponKillsSchema = Schema.Struct({
  characterId: MargonemId,
  world: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64)),
  weaponItemId: MargonemId,
  battleKey: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(128),
  ),
  events: CreateBattleSchema.fields.events,
});

export type RecordWeaponKillsInput = typeof RecordWeaponKillsSchema.Type;

export type WeaponKillsQuery = { world: string; characterId: string };

/**
 * Identifies a finishing blow by its battle and the log up to the row that
 * dealt it. The client names the battle, so two battles with the same rows
 * stay apart, while a log cut short when its submitter left and the whole
 * log of that battle agree.
 */
const createKillFingerprint = (
  { battleKey, characterId, events, world }: RecordWeaponKillsInput,
  moveIndex: number,
) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        battleKey,
        characterId,
        moves: events
          .flatMap((event) => event.f.m ?? [])
          .slice(0, moveIndex + 1),
        world,
      }),
    )
    .digest("hex");

type WeaponKillsDatabase = Pick<DrizzleDatabase, "insert" | "select">;

export const makeWeaponKills = (
  drizzle: WeaponKillsDatabase,
  read: BattleReadBudget,
) => {
  const countWeaponKills = (
    { world, characterId }: WeaponKillsQuery,
    itemId: string,
  ) =>
    drizzle
      .select({ kills: count() })
      .from(weaponKills)
      .where(
        and(
          eq(weaponKills.world, world),
          eq(weaponKills.characterId, characterId),
          eq(weaponKills.itemId, itemId),
        ),
      )
      .pipe(Effect.map(([row]) => row?.kills ?? 0));

  return {
    /**
     * Credits the submitter's finishing blows in a battle to the main weapon
     * it wore. The server reads them from the log; the client only names the
     * weapon. A blow submitted again keeps the weapon it was first credited to.
     */
    recordWeaponKills(data: RecordWeaponKillsInput, userId: string) {
      return Effect.gen(function* () {
        const kills = findFinishingBlows(data.events)
          .filter((blow) => blow.killerId === data.characterId)
          .map((blow) => ({
            world: data.world,
            characterId: data.characterId,
            killFingerprint: createKillFingerprint(data, blow.moveIndex),
            itemId: data.weaponItemId,
            userId,
          }));

        if (kills.length > 0) {
          yield* drizzle
            .insert(weaponKills)
            .values(kills)
            .onConflictDoNothing();
        }

        const total = yield* countWeaponKills(data, data.weaponItemId);

        return { itemId: data.weaponItemId, kills: total };
      });
    },

    getCharacterWeaponKills({ world, characterId }: WeaponKillsQuery) {
      return drizzle
        .select({
          itemId: weaponKills.itemId,
          kills: count(),
        })
        .from(weaponKills)
        .where(
          and(
            eq(weaponKills.world, world),
            eq(weaponKills.characterId, characterId),
          ),
        )
        .groupBy(weaponKills.itemId)
        .pipe(
          read,
          Effect.map((weapons) => ({ weapons })),
        );
    },
  };
};

export type WeaponKills = ReturnType<typeof makeWeaponKills>;
