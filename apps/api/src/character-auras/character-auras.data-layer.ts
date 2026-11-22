import type { GlobalChatAdmins } from "#src/global-chat/global-chat-admins";
import { and, asc, eq, inArray, isNotNull, or, type SQL } from "drizzle-orm";
import { Clock, Effect, Layer, Schema } from "effect";
import {
  CharacterAuraIdSchema,
  isAdminCharacterAuraId,
  isPersonalCharacterAuraId,
  PERSONAL_CHARACTER_AURA_IDS,
  type CharacterAurasChanged,
} from "@lootlog/schema/character-aura";
import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  characterAuraTable,
  userCharacterAuraGrantTable,
  userMargonemAccountTable,
  userPersonalCharacterAuraGrantTable,
} from "#src/database/drizzle/user.schema";
import type { CharacterAurasResponse } from "#src/contracts/character-auras/schemas";
import { currentMargonemAccountPlayers } from "#src/users/margonem-accounts";
import {
  CharacterAuraAccessDenied,
  type CharacterAuraCharacter,
  CharacterAuraGrantTargetNotFound,
  CharacterAurasData,
  CharacterAurasOperationError,
} from "./character-auras-data.js";

const isCharacterAuraId = Schema.is(CharacterAuraIdSchema);

const operationError = (cause: unknown) =>
  new CharacterAurasOperationError({ cause });

const accessDenied = () =>
  Effect.fail(new CharacterAuraAccessDenied({ status: 403 }));

const notFound = () =>
  Effect.fail(new CharacterAuraGrantTargetNotFound({ status: 404 }));

const byCharacter = (
  left: CharacterAuraCharacter,
  right: CharacterAuraCharacter,
) =>
  left.gameAccountId.localeCompare(right.gameAccountId) ||
  left.characterId.localeCompare(right.characterId);

export interface CharacterAurasEvents {
  readonly publishChanged: (
    change: CharacterAurasChanged,
  ) => Effect.Effect<void, unknown>;
}

export const CharacterAuraHolders = Schema.Struct({
  auras: Schema.Array(
    Schema.Struct({
      userId: Schema.String,
      gameAccountId: Schema.String,
      characterId: Schema.String,
      auraId: Schema.String,
    }),
  ),
  grantedUserIds: Schema.Array(Schema.String),
  personalGrants: Schema.Array(
    Schema.Struct({ userId: Schema.String, auraId: Schema.String }),
  ),
});

export type CharacterAuraHolders = typeof CharacterAuraHolders.Type;

export interface CharacterAurasCache {
  readonly list: <E>(
    load: Effect.Effect<CharacterAurasResponse, E>,
  ) => Effect.Effect<CharacterAurasResponse, E>;
  readonly holders: <E>(
    load: Effect.Effect<CharacterAuraHolders, E>,
  ) => Effect.Effect<CharacterAuraHolders, E>;
  readonly invalidate: Effect.Effect<void>;
}

const uncached: CharacterAurasCache = {
  list: (load) => load,
  holders: (load) => load,
  invalidate: Effect.void,
};

export const makeCharacterAurasData = (
  admins: GlobalChatAdmins,
  events: CharacterAurasEvents,
  cache: CharacterAurasCache = uncached,
) =>
  Effect.gen(function* () {
    const database = yield* ApiDatabase;

    const now = Effect.map(
      Clock.currentTimeMillis,
      (millis) => new Date(millis),
    );

    const shownAuras = (where?: SQL) => {
      const players = currentMargonemAccountPlayers(
        database,
        inArray(
          userMargonemAccountTable.accountId,
          database
            .select({ accountId: characterAuraTable.accountId })
            .from(characterAuraTable)
            .where(where),
        ),
      );

      return database
        .select({
          gameAccountId: characterAuraTable.accountId,
          characterId: characterAuraTable.characterId,
          userId: characterAuraTable.userId,
          auraId: characterAuraTable.auraId,
          personalHolder: userPersonalCharacterAuraGrantTable.userId,
        })
        .from(characterAuraTable)
        .innerJoin(
          players,
          and(
            eq(players.accountId, characterAuraTable.accountId),
            eq(players.userId, characterAuraTable.userId),
          ),
        )
        .leftJoin(
          userCharacterAuraGrantTable,
          eq(userCharacterAuraGrantTable.userId, characterAuraTable.userId),
        )
        .leftJoin(
          userPersonalCharacterAuraGrantTable,
          and(
            eq(
              userPersonalCharacterAuraGrantTable.userId,
              characterAuraTable.userId,
            ),
            eq(
              userPersonalCharacterAuraGrantTable.auraId,
              characterAuraTable.auraId,
            ),
          ),
        )
        .where(
          and(
            where,
            or(
              isNotNull(userCharacterAuraGrantTable.userId),
              isNotNull(userPersonalCharacterAuraGrantTable.userId),
              admins.ids().length === 0
                ? undefined
                : inArray(characterAuraTable.userId, [...admins.ids()]),
            ),
          ),
        )
        .orderBy(
          asc(characterAuraTable.accountId),
          asc(characterAuraTable.characterId),
        )
        .pipe(
          Effect.map((rows) =>
            rows.flatMap(
              ({
                gameAccountId,
                characterId,
                userId,
                auraId,
                personalHolder,
              }) =>
                isCharacterAuraId(auraId) &&
                (admins.has(userId) ||
                  (isPersonalCharacterAuraId(auraId)
                    ? personalHolder !== null
                    : !isAdminCharacterAuraId(auraId)))
                  ? [{ gameAccountId, characterId, auraId }]
                  : [],
            ),
          ),
        );
    };

    const isCharacter = ({
      gameAccountId,
      characterId,
    }: CharacterAuraCharacter) =>
      and(
        eq(characterAuraTable.accountId, gameAccountId),
        eq(characterAuraTable.characterId, characterId),
      );

    const isGranted = (userId: string) =>
      database
        .select({ userId: userCharacterAuraGrantTable.userId })
        .from(userCharacterAuraGrantTable)
        .where(eq(userCharacterAuraGrantTable.userId, userId))
        .limit(1)
        .pipe(Effect.map((rows) => rows.length > 0));

    const canChange = (userId: string) =>
      admins.has(userId) ? Effect.succeed(true) : isGranted(userId);

    const holdsPersonalAura = (userId: string, auraId: string) =>
      admins.has(userId)
        ? Effect.succeed(true)
        : database
            .select({ userId: userPersonalCharacterAuraGrantTable.userId })
            .from(userPersonalCharacterAuraGrantTable)
            .where(
              and(
                eq(userPersonalCharacterAuraGrantTable.userId, userId),
                eq(userPersonalCharacterAuraGrantTable.auraId, auraId),
              ),
            )
            .limit(1)
            .pipe(Effect.map((rows) => rows.length > 0));

    const playsAccount = (userId: string, gameAccountId: string) =>
      database
        .select({ userId: userMargonemAccountTable.userId })
        .from(userMargonemAccountTable)
        .where(
          and(
            eq(userMargonemAccountTable.userId, userId),
            eq(userMargonemAccountTable.accountId, gameAccountId),
          ),
        )
        .limit(1)
        .pipe(Effect.map((rows) => rows.length > 0));

    const holders = cache.holders(
      Effect.all({
        auras: database
          .select({
            userId: characterAuraTable.userId,
            gameAccountId: characterAuraTable.accountId,
            characterId: characterAuraTable.characterId,
            auraId: characterAuraTable.auraId,
          })
          .from(characterAuraTable),
        grantedUserIds: database
          .select({ userId: userCharacterAuraGrantTable.userId })
          .from(userCharacterAuraGrantTable)
          .pipe(Effect.map((rows) => rows.map((row) => row.userId))),
        personalGrants: database
          .select({
            userId: userPersonalCharacterAuraGrantTable.userId,
            auraId: userPersonalCharacterAuraGrantTable.auraId,
          })
          .from(userPersonalCharacterAuraGrantTable),
      }),
    );

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

    const announce = (characters: ReadonlyArray<CharacterAuraCharacter>) =>
      Effect.gen(function* () {
        if (characters.length === 0) return;

        const shown = yield* shownAuras(or(...characters.map(isCharacter)));

        yield* events.publishChanged({
          auras: characters.map(({ gameAccountId, characterId }) => ({
            gameAccountId,
            characterId,
            auraId:
              shown.find(
                (aura) =>
                  aura.gameAccountId === gameAccountId &&
                  aura.characterId === characterId,
              )?.auraId ?? null,
          })),
        });
      }).pipe(ignorePublicationFailure);

    const getOwnAura = (userId: string) =>
      Effect.gen(function* () {
        const { auras, grantedUserIds, personalGrants } = yield* holders;

        const granted = new Set(
          personalGrants.flatMap((grant) =>
            grant.userId === userId ? [grant.auraId] : [],
          ),
        );

        return {
          auras: auras
            .flatMap(
              ({ userId: holder, gameAccountId, characterId, auraId }) =>
                holder === userId && isCharacterAuraId(auraId)
                  ? [{ gameAccountId, characterId, auraId }]
                  : [],
            )
            .toSorted(byCharacter),
          canChange: admins.has(userId) || grantedUserIds.includes(userId),
          personalAuraIds: PERSONAL_CHARACTER_AURA_IDS.filter(
            (auraId) => admins.has(userId) || granted.has(auraId),
          ),
          canGrant: admins.has(userId),
        };
      }).pipe(Effect.mapError(operationError));

    return CharacterAurasData.of({
      getAuras: cache.list(
        shownAuras().pipe(
          Effect.mapBoth({
            onSuccess: (auras) => ({ auras }),
            onFailure: operationError,
          }),
        ),
      ),
      getOwnAura,
      updateOwnAura: (userId, character, auraId) =>
        Effect.gen(function* () {
          if (auraId === null) {
            const removed = yield* database
              .delete(characterAuraTable)
              .where(
                and(
                  isCharacter(character),
                  eq(characterAuraTable.userId, userId),
                ),
              )
              .returning({ userId: characterAuraTable.userId })
              .pipe(Effect.mapError(operationError));

            if (removed.length > 0) {
              yield* cache.invalidate;
              yield* announce([character]);
            }

            return yield* getOwnAura(userId);
          }

          const allowed = yield* Effect.all([
            isAdminCharacterAuraId(auraId)
              ? Effect.succeed(admins.has(userId))
              : isPersonalCharacterAuraId(auraId)
                ? holdsPersonalAura(userId, auraId)
                : canChange(userId),
            playsAccount(userId, character.gameAccountId),
          ]).pipe(
            Effect.mapBoth({
              onSuccess: ([access, plays]) => access && plays,
              onFailure: operationError,
            }),
          );

          if (!allowed) return yield* accessDenied();
          const updatedAt = yield* now;

          yield* database
            .insert(characterAuraTable)
            .values({
              accountId: character.gameAccountId,
              characterId: character.characterId,
              userId,
              auraId,
              updatedAt,
            })
            .onConflictDoUpdate({
              target: [
                characterAuraTable.accountId,
                characterAuraTable.characterId,
              ],
              set: { userId, auraId, updatedAt },
            })
            .pipe(Effect.mapError(operationError));
          yield* cache.invalidate;
          yield* announce([character]);

          return yield* getOwnAura(userId);
        }),
      grantAuras: (callerUserId, gameAccountId) =>
        Effect.gen(function* () {
          const userId = yield* grantTarget(callerUserId, gameAccountId);
          const grantedAt = yield* now;

          yield* database
            .insert(userCharacterAuraGrantTable)
            .values({ userId, grantedByUserId: callerUserId, grantedAt })
            .onConflictDoNothing({ target: userCharacterAuraGrantTable.userId })
            .pipe(Effect.mapError(operationError));
          yield* cache.invalidate;
        }),
      grantPersonalAura: (callerUserId, gameAccountId, auraId) =>
        Effect.gen(function* () {
          const userId = yield* grantTarget(callerUserId, gameAccountId);
          const grantedAt = yield* now;

          yield* database
            .insert(userPersonalCharacterAuraGrantTable)
            .values({
              userId,
              auraId,
              grantedByUserId: callerUserId,
              grantedAt,
            })
            .onConflictDoNothing({
              target: [
                userPersonalCharacterAuraGrantTable.userId,
                userPersonalCharacterAuraGrantTable.auraId,
              ],
            })
            .pipe(Effect.mapError(operationError));
          yield* cache.invalidate;
        }),
      revokeAuras: (callerUserId, gameAccountId) =>
        Effect.gen(function* () {
          const userId = yield* grantTarget(callerUserId, gameAccountId);

          const removed = yield* database
            .transaction((transaction) =>
              Effect.gen(function* () {
                yield* transaction
                  .delete(userCharacterAuraGrantTable)
                  .where(eq(userCharacterAuraGrantTable.userId, userId));
                yield* transaction
                  .delete(userPersonalCharacterAuraGrantTable)
                  .where(
                    eq(userPersonalCharacterAuraGrantTable.userId, userId),
                  );

                if (admins.has(userId)) return [];

                return yield* transaction
                  .delete(characterAuraTable)
                  .where(eq(characterAuraTable.userId, userId))
                  .returning({
                    gameAccountId: characterAuraTable.accountId,
                    characterId: characterAuraTable.characterId,
                  });
              }),
            )
            .pipe(Effect.mapError(operationError));

          yield* cache.invalidate;
          yield* announce(removed.toSorted(byCharacter));
        }),
    });
  });

export const characterAurasDataLayer = (
  admins: GlobalChatAdmins,
  events: CharacterAurasEvents,
  cache: CharacterAurasCache,
) =>
  Layer.effect(
    CharacterAurasData,
    makeCharacterAurasData(admins, events, cache),
  );
