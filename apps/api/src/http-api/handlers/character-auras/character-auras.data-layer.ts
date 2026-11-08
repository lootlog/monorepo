import { asc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { Clock, Effect, Layer, Schema } from "effect";
import { CharacterAuraIdSchema } from "@lootlog/schema/character-aura";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  characterAuraGrantTable,
  userCharacterAuraTable,
} from "#src/database/drizzle/user.schema";
import { currentMargonemAccountPlayers } from "#src/margonem-accounts/margonem-accounts";
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
 * Auras are a perk of the global chat admins in `adminUserIds` and of the
 * Users an admin granted one. A User who loses it keeps the stored choice but
 * no longer shows it, and may only remove it.
 */
export const makeCharacterAurasData = (adminUserIds: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const admins = new Set(adminUserIds);

    const isGranted = (userId: string) =>
      database
        .select({ userId: characterAuraGrantTable.userId })
        .from(characterAuraGrantTable)
        .where(eq(characterAuraGrantTable.userId, userId))
        .limit(1)
        .pipe(Effect.map((rows) => rows.length > 0));

    const isEntitled = (userId: string) =>
      admins.has(userId) ? Effect.succeed(true) : isGranted(userId);

    const entitledAura =
      admins.size === 0
        ? isNotNull(characterAuraGrantTable.userId)
        : or(
            inArray(userCharacterAuraTable.userId, [...admins]),
            isNotNull(characterAuraGrantTable.userId),
          );

    const now = Effect.map(
      Clock.currentTimeMillis,
      (millis) => new Date(millis),
    );

    // An aura shows on the Margonem accounts its User proved to play, each
    // with the aura of the User who proved it last.
    const players = currentMargonemAccountPlayers(database);

    const getOwnAura = (userId: string) =>
      Effect.gen(function* () {
        const [aura] = yield* database
          .select({ auraId: userCharacterAuraTable.auraId })
          .from(userCharacterAuraTable)
          .where(eq(userCharacterAuraTable.userId, userId))
          .limit(1);

        const auraId =
          aura && isCharacterAuraId(aura.auraId) ? aura.auraId : null;

        const accounts =
          auraId === null
            ? []
            : yield* database
                .select({ id: players.accountId })
                .from(players)
                .where(eq(players.userId, userId))
                .orderBy(asc(players.accountId));

        return {
          auraId,
          canChange: yield* isEntitled(userId),
          gameAccountIds: accounts.map((account) => account.id),
        };
      }).pipe(Effect.mapError(operationError));

    return CharacterAurasData.of({
      getAuras: () =>
        database
          .select({
            gameAccountId: players.accountId,
            auraId: userCharacterAuraTable.auraId,
          })
          .from(players)
          .innerJoin(
            userCharacterAuraTable,
            eq(userCharacterAuraTable.userId, players.userId),
          )
          .leftJoin(
            characterAuraGrantTable,
            eq(characterAuraGrantTable.userId, userCharacterAuraTable.userId),
          )
          .where(entitledAura)
          .orderBy(asc(players.accountId))
          .pipe(
            Effect.mapBoth({
              onSuccess: (rows) => ({
                auras: rows.flatMap(({ gameAccountId, auraId }) =>
                  isCharacterAuraId(auraId) ? [{ gameAccountId, auraId }] : [],
                ),
              }),
              onFailure: operationError,
            }),
          ),
      getOwnAura,
      updateOwnAura: (userId, auraId) =>
        Effect.gen(function* () {
          if (auraId === null) {
            yield* database
              .delete(userCharacterAuraTable)
              .where(eq(userCharacterAuraTable.userId, userId))
              .pipe(Effect.mapError(operationError));

            return yield* getOwnAura(userId);
          }

          const entitled = yield* isEntitled(userId).pipe(
            Effect.mapError(operationError),
          );

          if (!entitled) return yield* accessDenied();
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
      // Deprecated: accounts follow verified Margonem proofs. Older Game
      // clients still call it, so it only reports whether the aura shows.
      linkGameAccount: (userId) =>
        Effect.gen(function* () {
          const own = yield* getOwnAura(userId);

          if (!own.canChange || own.auraId === null)
            return yield* accessDenied();

          return own;
        }),
    });
  });

export const characterAurasDataLayer = (adminUserIds: ReadonlyArray<string>) =>
  Layer.effect(CharacterAurasData, makeCharacterAurasData(adminUserIds));
