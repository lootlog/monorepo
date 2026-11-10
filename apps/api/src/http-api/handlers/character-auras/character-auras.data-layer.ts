import { asc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { Clock, Effect, Layer, Schema } from "effect";
import {
  CharacterAuraIdSchema,
  isAdminCharacterAuraId,
  type CharacterAuraId,
  type CharacterAurasChanged,
} from "@lootlog/schema/character-aura";
import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  userCharacterAuraGrantTable,
  userCharacterAuraTable,
  userMargonemAccountTable,
} from "#src/database/drizzle/user.schema";
import type { CharacterAurasResponse } from "#src/contracts/character-auras/schemas";
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

/** Tells every Game client which aura the accounts show now. */
export interface CharacterAurasEvents {
  readonly publishChanged: (
    change: CharacterAurasChanged,
  ) => Effect.Effect<void, unknown>;
}

/**
 * Holds the list every Game client reads at startup. The list is the same for
 * every reader, so one stored copy serves them all.
 */
export interface CharacterAurasListCache {
  readonly read: <E>(
    load: Effect.Effect<CharacterAurasResponse, E>,
  ) => Effect.Effect<CharacterAurasResponse, E>;
  readonly invalidate: Effect.Effect<void>;
}

const uncachedList: CharacterAurasListCache = {
  read: (load) => load,
  invalidate: Effect.void,
};

/**
 * Auras are a perk of the Users in `adminUserIds` and of the Users an admin
 * granted them to. A User who loses it keeps no shown aura: revoking a grant
 * deletes the aura, and an admin dropped from `adminUserIds` keeps the stored
 * choice but no longer shows it, and may only remove it. Admin auras are
 * the admins' own: only they choose them, and only theirs show.
 */
export const makeCharacterAurasData = (
  adminUserIds: ReadonlyArray<string>,
  events: CharacterAurasEvents,
  listCache: CharacterAurasListCache = uncachedList,
) =>
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const admins = new Set(adminUserIds);

    const now = Effect.map(
      Clock.currentTimeMillis,
      (millis) => new Date(millis),
    );

    // An aura shows on the Margonem accounts its User proved to play, each
    // with the aura of the User who proved it last. Scoping `DISTINCT ON
    // ("accountId")` by candidate `accountId`s keeps every user's proofs for
    // those accounts while avoiding a full-table scan of `UserMargonemAccount`.
    const auraPlayers = currentMargonemAccountPlayers(
      database,
      inArray(
        userMargonemAccountTable.accountId,
        database
          .select({ accountId: userMargonemAccountTable.accountId })
          .from(userMargonemAccountTable)
          .innerJoin(
            userCharacterAuraTable,
            eq(userCharacterAuraTable.userId, userMargonemAccountTable.userId),
          ),
      ),
    );

    const userAccounts = (userId: string) => {
      const players = currentMargonemAccountPlayers(
        database,
        inArray(
          userMargonemAccountTable.accountId,
          database
            .select({ accountId: userMargonemAccountTable.accountId })
            .from(userMargonemAccountTable)
            .where(eq(userMargonemAccountTable.userId, userId)),
        ),
      );

      return database
        .select({ id: players.accountId })
        .from(players)
        .where(eq(players.userId, userId))
        .orderBy(asc(players.accountId));
    };

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

        const players = currentMargonemAccountPlayers(
          database,
          eq(userMargonemAccountTable.accountId, gameAccountId),
        );

        const [player] = yield* database
          .select({ userId: players.userId })
          .from(players)
          .where(eq(players.accountId, gameAccountId))
          .limit(1)
          .pipe(Effect.mapError(operationError));

        return player ? player.userId : yield* notFound();
      });

    /**
     * Shows the User's new aura on their accounts without waiting for the
     * next list refresh. The change is committed; a lost event reaches
     * readers with that refresh.
     */
    const announce = (userId: string, auraId: CharacterAuraId | null) =>
      Effect.gen(function* () {
        const accounts = yield* userAccounts(userId);

        if (accounts.length === 0) return;

        yield* events.publishChanged({
          auras: accounts.map(({ id }) => ({ gameAccountId: id, auraId })),
        });
      }).pipe(ignorePublicationFailure);

    const getOwnAura = (userId: string) =>
      Effect.gen(function* () {
        const [aura] = yield* database
          .select({ auraId: userCharacterAuraTable.auraId })
          .from(userCharacterAuraTable)
          .where(eq(userCharacterAuraTable.userId, userId))
          .limit(1);

        const auraId =
          aura && isCharacterAuraId(aura.auraId) ? aura.auraId : null;

        const accounts = auraId === null ? [] : yield* userAccounts(userId);

        return {
          auraId,
          canChange: yield* canChange(userId),
          canGrant: admins.has(userId),
          gameAccountIds: accounts.map((account) => account.id),
        };
      }).pipe(Effect.mapError(operationError));

    return CharacterAurasData.of({
      getAuras: () =>
        listCache.read(
          database
            .select({
              gameAccountId: auraPlayers.accountId,
              userId: userCharacterAuraTable.userId,
              auraId: userCharacterAuraTable.auraId,
            })
            .from(auraPlayers)
            .innerJoin(
              userCharacterAuraTable,
              eq(userCharacterAuraTable.userId, auraPlayers.userId),
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
            .orderBy(asc(auraPlayers.accountId))
            .pipe(
              Effect.mapBoth({
                onSuccess: (rows) => ({
                  auras: rows.flatMap(({ gameAccountId, userId, auraId }) =>
                    isCharacterAuraId(auraId) &&
                    (admins.has(userId) || !isAdminCharacterAuraId(auraId))
                      ? [{ gameAccountId, auraId }]
                      : [],
                  ),
                }),
                onFailure: operationError,
              }),
            ),
        ),
      getOwnAura,
      updateOwnAura: (userId, auraId) =>
        Effect.gen(function* () {
          if (auraId === null) {
            yield* database
              .delete(userCharacterAuraTable)
              .where(eq(userCharacterAuraTable.userId, userId))
              .pipe(Effect.mapError(operationError));
            yield* listCache.invalidate;
            yield* announce(userId, null);

            return yield* getOwnAura(userId);
          }

          const allowed = isAdminCharacterAuraId(auraId)
            ? admins.has(userId)
            : yield* canChange(userId).pipe(Effect.mapError(operationError));

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
          yield* listCache.invalidate;
          yield* announce(userId, auraId);

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
          // A stored aura starts to show once its User is granted.
          yield* listCache.invalidate;
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
          yield* listCache.invalidate;

          if (!admins.has(userId)) yield* announce(userId, null);
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

export const characterAurasDataLayer = (
  adminUserIds: ReadonlyArray<string>,
  events: CharacterAurasEvents,
  listCache: CharacterAurasListCache,
) =>
  Layer.effect(
    CharacterAurasData,
    makeCharacterAurasData(adminUserIds, events, listCache),
  );
