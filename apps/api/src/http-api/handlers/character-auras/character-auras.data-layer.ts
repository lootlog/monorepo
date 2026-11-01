import { asc, eq, inArray } from "drizzle-orm";
import { Clock, Effect, Layer, Schema } from "effect";
import { CharacterAuraIdSchema } from "@lootlog/schema/character-aura";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  userCharacterAuraGameAccountTable,
  userCharacterAuraTable,
} from "#src/database/drizzle/schema";
import {
  CharacterAuraAccessDenied,
  CharacterAurasData,
  CharacterAurasOperationError,
} from "./character-auras.handlers.js";

// A stored id the Game client no longer draws reads as no aura.
const isCharacterAuraId = Schema.is(CharacterAuraIdSchema);

const operationError = (cause: unknown) =>
  new CharacterAurasOperationError({ cause });

const accessDenied = () =>
  Effect.fail(new CharacterAuraAccessDenied({ status: 403 }));

/**
 * Auras are a perk of the Users in `entitledUserIds`. A User who loses it
 * keeps the stored choice but no longer shows it, and may only remove it.
 */
export const makeCharacterAurasData = (
  entitledUserIds: ReadonlyArray<string>,
) =>
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const entitled = new Set(entitledUserIds);

    const now = Effect.map(
      Clock.currentTimeMillis,
      (millis) => new Date(millis),
    );

    const getOwnAura = (userId: string) =>
      Effect.gen(function* () {
        const [aura] = yield* database
          .select({ auraId: userCharacterAuraTable.auraId })
          .from(userCharacterAuraTable)
          .where(eq(userCharacterAuraTable.userId, userId))
          .limit(1);

        const accounts = yield* database
          .select({ id: userCharacterAuraGameAccountTable.gameAccountId })
          .from(userCharacterAuraGameAccountTable)
          .where(eq(userCharacterAuraGameAccountTable.userId, userId))
          .orderBy(asc(userCharacterAuraGameAccountTable.linkedAt));

        return {
          auraId: aura && isCharacterAuraId(aura.auraId) ? aura.auraId : null,
          canChange: entitled.has(userId),
          gameAccountIds: accounts.map((account) => account.id),
        };
      }).pipe(Effect.mapError(operationError));

    return CharacterAurasData.of({
      getAuras: () =>
        entitled.size === 0
          ? Effect.succeed({ auras: [] })
          : database
              .select({
                gameAccountId: userCharacterAuraGameAccountTable.gameAccountId,
                auraId: userCharacterAuraTable.auraId,
              })
              .from(userCharacterAuraGameAccountTable)
              .innerJoin(
                userCharacterAuraTable,
                eq(
                  userCharacterAuraTable.userId,
                  userCharacterAuraGameAccountTable.userId,
                ),
              )
              .where(inArray(userCharacterAuraTable.userId, [...entitled]))
              .orderBy(asc(userCharacterAuraGameAccountTable.gameAccountId))
              .pipe(
                Effect.map((rows) => ({
                  auras: rows.flatMap(({ gameAccountId, auraId }) =>
                    isCharacterAuraId(auraId)
                      ? [{ gameAccountId, auraId }]
                      : [],
                  ),
                })),
                Effect.mapError(operationError),
              ),
      getOwnAura,
      updateOwnAura: (userId, auraId) =>
        Effect.gen(function* () {
          if (auraId === null) {
            // Removing the aura also stops showing it on every account.
            yield* database
              .transaction((transaction) =>
                Effect.gen(function* () {
                  yield* transaction
                    .delete(userCharacterAuraTable)
                    .where(eq(userCharacterAuraTable.userId, userId));
                  yield* transaction
                    .delete(userCharacterAuraGameAccountTable)
                    .where(
                      eq(userCharacterAuraGameAccountTable.userId, userId),
                    );
                }),
              )
              .pipe(Effect.mapError(operationError));

            return yield* getOwnAura(userId);
          }

          if (!entitled.has(userId)) return yield* accessDenied();
          const updatedAt = yield* now;

          yield* database
            .insert(userCharacterAuraTable)
            .values({ userId, auraId, updatedAt })
            .onConflictDoUpdate({
              target: userCharacterAuraTable.userId,
              set: { auraId, updatedAt },
            })
            .pipe(Effect.mapError(operationError));

          return yield* getOwnAura(userId);
        }),
      linkGameAccount: (userId, gameAccountId) =>
        Effect.gen(function* () {
          const own = yield* getOwnAura(userId);

          if (!own.canChange || own.auraId === null)
            return yield* accessDenied();

          if (own.gameAccountIds.includes(gameAccountId)) return own;
          const linkedAt = yield* now;

          // A Margonem account shows the aura of the User who played it last.
          yield* database
            .insert(userCharacterAuraGameAccountTable)
            .values({ gameAccountId, userId, linkedAt })
            .onConflictDoUpdate({
              target: userCharacterAuraGameAccountTable.gameAccountId,
              set: { userId, linkedAt },
            })
            .pipe(Effect.mapError(operationError));

          return yield* getOwnAura(userId);
        }),
    });
  });

export const characterAurasDataLayer = (
  entitledUserIds: ReadonlyArray<string>,
) => Layer.effect(CharacterAurasData, makeCharacterAurasData(entitledUserIds));
