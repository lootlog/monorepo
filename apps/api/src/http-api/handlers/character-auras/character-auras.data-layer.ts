import { asc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { Clock, Effect, Layer, Schema } from "effect";
import { CharacterAuraIdSchema } from "@lootlog/schema/character-aura";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  userCharacterAuraGrantTable,
  userCharacterAuraTable,
} from "#src/database/drizzle/user.schema";
import { currentMargonemAccountPlayers } from "#src/margonem-accounts/margonem-accounts";
import {
  CharacterAuraAccessDenied,
  CharacterAuraGrantTargetNotFound,
  CharacterAurasData,
  CharacterAurasOperationError,
} from "./character-auras.handlers.js";

// A stored id the Game client no longer draws reads as no aura.
const isCharacterAuraId = Schema.is(CharacterAuraIdSchema);

const operationError = (cause: unknown) =>
  new CharacterAurasOperationError({ cause });

const accessDenied = () =>
  Effect.fail(new CharacterAuraAccessDenied({ status: 403 }));

const notFound = () =>
  Effect.fail(new CharacterAuraGrantTargetNotFound({ status: 404 }));

/**
 * Auras are a perk of the Users in `adminUserIds` and of the Users an admin
 * granted them to. A User who loses it keeps no shown aura: revoking a grant
 * deletes the aura, and an admin dropped from `adminUserIds` keeps the stored
 * choice but no longer shows it, and may only remove it.
 */
export const makeCharacterAurasData = (adminUserIds: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const admins = new Set(adminUserIds);

    const now = Effect.map(
      Clock.currentTimeMillis,
      (millis) => new Date(millis),
    );

    // An aura shows on the Margonem accounts its User proved to play, each
    // with the aura of the User who proved it last.
    const players = currentMargonemAccountPlayers(database);

    const isGranted = (userId: string) =>
      database
        .select({ userId: userCharacterAuraGrantTable.userId })
        .from(userCharacterAuraGrantTable)
        .where(eq(userCharacterAuraGrantTable.userId, userId))
        .limit(1)
        .pipe(Effect.map((rows) => rows.length > 0));

    const canChange = (userId: string) =>
      admins.has(userId) ? Effect.succeed(true) : isGranted(userId);

    /**
     * Only admins grant. The account names the User who proved to play it
     * last, the same User whose aura shows on it.
     */
    const grantTarget = (callerUserId: string, gameAccountId: string) =>
      Effect.gen(function* () {
        if (!admins.has(callerUserId)) return yield* accessDenied();

        const [player] = yield* database
          .select({ userId: players.userId })
          .from(players)
          .where(eq(players.accountId, gameAccountId))
          .limit(1)
          .pipe(Effect.mapError(operationError));

        return player ? player.userId : yield* notFound();
      });

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
          canChange: yield* canChange(userId),
          canGrant: admins.has(userId),
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
            userCharacterAuraGrantTable,
            eq(
              userCharacterAuraGrantTable.userId,
              userCharacterAuraTable.userId,
            ),
          )
          .where(
            or(
              isNotNull(userCharacterAuraGrantTable.userId),
              admins.size === 0
                ? undefined
                : inArray(userCharacterAuraTable.userId, [...admins]),
            ),
          )
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

          const allowed = yield* canChange(userId).pipe(
            Effect.mapError(operationError),
          );

          if (!allowed) return yield* accessDenied();
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
      grantAuras: (callerUserId, gameAccountId) =>
        Effect.gen(function* () {
          const userId = yield* grantTarget(callerUserId, gameAccountId);
          const grantedAt = yield* now;

          // Granting again keeps the first grant.
          yield* database
            .insert(userCharacterAuraGrantTable)
            .values({ userId, grantedByUserId: callerUserId, grantedAt })
            .onConflictDoNothing({ target: userCharacterAuraGrantTable.userId })
            .pipe(Effect.mapError(operationError));
        }),
      // An admin keeps access, and the aura with it, while listed.
      revokeAuras: (callerUserId, gameAccountId) =>
        Effect.gen(function* () {
          const userId = yield* grantTarget(callerUserId, gameAccountId);

          yield* database
            .transaction((transaction) =>
              Effect.gen(function* () {
                yield* transaction
                  .delete(userCharacterAuraGrantTable)
                  .where(eq(userCharacterAuraGrantTable.userId, userId));

                if (admins.has(userId)) return;

                yield* transaction
                  .delete(userCharacterAuraTable)
                  .where(eq(userCharacterAuraTable.userId, userId));
              }),
            )
            .pipe(Effect.mapError(operationError));
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
