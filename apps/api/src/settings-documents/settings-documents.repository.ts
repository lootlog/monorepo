import { decodeSettingsRecord } from "@lootlog/domain/settings-paths";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  migrateSettingsDocument,
  SETTINGS_CATALOG,
} from "@lootlog/domain/settings-documents";
import type {
  PatchSettingsDocuments,
  SettingsDomain,
  SettingsScope,
} from "@lootlog/schema/settings-documents";
import { and, eq, inArray, or } from "drizzle-orm";
import { uniqBy } from "es-toolkit";
import {
  Cause,
  Clock,
  Context,
  Effect,
  Layer,
  Schema,
  Predicate,
} from "effect";
import { ApiDatabase } from "../database/drizzle/database.js";
import {
  memberTable,
  userSettingDocumentTable,
} from "../database/drizzle/schema.js";
import { applySettingsPatch, type JsonRecord } from "./settings-resolver.js";

type SettingsOperation = PatchSettingsDocuments["operations"][number];

type StoredSettingsDocument = typeof userSettingDocumentTable.$inferSelect;

/** Identifies one document of a user; scope types and domains contain no `:`. */
const getSettingsDocumentKey = (
  domain: string,
  scopeType: SettingsScope["type"],
  scopeId: string,
) => `${domain}:${scopeType}:${scopeId}`;

export const getSettingsOperationKey = (operation: SettingsOperation) =>
  getSettingsDocumentKey(
    operation.domain,
    operation.scope.type,
    operation.scope.id,
  );

const getPostgresErrorCode = (error: unknown): string | undefined => {
  if (Cause.isCause(error)) return getPostgresErrorCode(Cause.squash(error));

  if (!Predicate.isObject(error)) return undefined;

  if (typeof error.code === "string") return error.code;

  return getPostgresErrorCode(error.cause);
};

export class InvalidSettingsPatchError extends TaggedErrorClass<InvalidSettingsPatchError>()(
  "InvalidSettingsPatchError",
  { message: Schema.String },
) {}

export class SettingsPersistenceError extends TaggedErrorClass<SettingsPersistenceError>()(
  "SettingsPersistenceError",
  { cause: Schema.Defect() },
) {}

type RepositoryFailure = InvalidSettingsPatchError | SettingsPersistenceError;

export interface SettingsDocumentsRepositoryService {
  readonly findDocuments: (
    userId: string,
    domains: ReadonlyArray<SettingsDomain>,
    scopes: ReadonlyArray<SettingsScope>,
  ) => Effect.Effect<
    ReadonlyArray<StoredSettingsDocument>,
    SettingsPersistenceError
  >;
  readonly hasActiveGuildMembership: (
    userId: string,
    guildId: string,
  ) => Effect.Effect<boolean, SettingsPersistenceError>;
  /** The subset of `guildIds` the user is an active member of. */
  readonly findActiveGuildMemberships: (
    userId: string,
    guildIds: ReadonlyArray<string>,
  ) => Effect.Effect<string[], SettingsPersistenceError>;
  readonly applyOperations: (
    userId: string,
    operations: ReadonlyArray<SettingsOperation>,
  ) => Effect.Effect<void, RepositoryFailure>;
}

export class SettingsDocumentsRepository extends Context.Service<
  SettingsDocumentsRepository,
  SettingsDocumentsRepositoryService
>()("@lootlog/api/settings-documents/repository") {
  static readonly layerDatabase = Layer.effect(
    SettingsDocumentsRepository,
    Effect.map(ApiDatabase, (database) => {
      const persistenceError = (cause: unknown) =>
        new SettingsPersistenceError({ cause });

      const applyOperationsAttempt = (
        userId: string,
        operations: ReadonlyArray<SettingsOperation>,
        attempt: number,
      ): Effect.Effect<void, RepositoryFailure> =>
        database
          .transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction.setTransaction({
                isolationLevel: "serializable",
              });

              const lockedDocuments = yield* transaction
                .select()
                .from(userSettingDocumentTable)
                .where(
                  and(
                    eq(userSettingDocumentTable.userId, userId),
                    or(
                      ...uniqBy(operations, getSettingsOperationKey).map(
                        (operation) =>
                          and(
                            eq(
                              userSettingDocumentTable.domain,
                              operation.domain,
                            ),
                            eq(
                              userSettingDocumentTable.scopeType,
                              operation.scope.type,
                            ),
                            eq(
                              userSettingDocumentTable.scopeId,
                              operation.scope.id,
                            ),
                          ),
                      ),
                    ),
                  ),
                )
                // One lock order for every batch keeps concurrent batches from
                // deadlocking on each other's rows.
                .orderBy(
                  userSettingDocumentTable.domain,
                  userSettingDocumentTable.scopeType,
                  userSettingDocumentTable.scopeId,
                )
                .for("update");

              const storedDocuments = new Map(
                lockedDocuments.map((document) => [
                  getSettingsDocumentKey(
                    document.domain,
                    document.scopeType,
                    document.scopeId,
                  ),
                  document,
                ]),
              );

              // Patches to the same document apply in batch order, each over
              // the result of the previous one.
              const nextDocuments = new Map<
                string,
                {
                  domain: SettingsDomain;
                  scope: SettingsScope;
                  stored: StoredSettingsDocument | undefined;
                  overrides: JsonRecord;
                }
              >();

              for (const operation of operations) {
                const key = getSettingsOperationKey(operation);
                const stored = storedDocuments.get(key);

                try {
                  // Bring the stored document to the catalog version before
                  // patching, so the row written below matches the version
                  // it is stamped with.
                  const currentOverrides =
                    nextDocuments.get(key)?.overrides ??
                    (Predicate.isObject(stored?.overrides)
                      ? migrateSettingsDocument(
                          operation.domain,
                          decodeSettingsRecord(stored.overrides),
                          stored.schemaVersion,
                        )
                      : {});

                  nextDocuments.set(key, {
                    domain: operation.domain,
                    scope: operation.scope,
                    stored,
                    overrides: applySettingsPatch({
                      domain: operation.domain,
                      scope: operation.scope,
                      currentOverrides,
                      set: operation.set,
                      unset: operation.unset,
                    }),
                  });
                } catch (error) {
                  return yield* new InvalidSettingsPatchError({
                    message:
                      error instanceof Error
                        ? error.message
                        : "Invalid settings operation",
                  });
                }
              }

              const updatedAt = new Date(yield* Clock.currentTimeMillis);

              for (const {
                domain,
                scope,
                stored,
                overrides,
              } of nextDocuments.values()) {
                if (Object.keys(overrides).length === 0) {
                  if (stored) {
                    yield* transaction
                      .delete(userSettingDocumentTable)
                      .where(eq(userSettingDocumentTable.id, stored.id));
                  }

                  continue;
                }

                const data = {
                  overrides,
                  schemaVersion: SETTINGS_CATALOG[domain].schemaVersion,
                  updatedAt,
                };

                if (stored) {
                  yield* transaction
                    .update(userSettingDocumentTable)
                    .set(data)
                    .where(eq(userSettingDocumentTable.id, stored.id));
                  continue;
                }

                yield* transaction
                  .insert(userSettingDocumentTable)
                  .values({
                    userId,
                    domain,
                    scopeType: scope.type,
                    scopeId: scope.id,
                    ...data,
                  })
                  .onConflictDoUpdate({
                    target: [
                      userSettingDocumentTable.userId,
                      userSettingDocumentTable.domain,
                      userSettingDocumentTable.scopeType,
                      userSettingDocumentTable.scopeId,
                    ],
                    set: data,
                  });
              }
            }),
          )
          .pipe(
            Effect.withSpan("settings.applyOperations.transaction", {
              attributes: { retryCount: attempt },
            }),
            Effect.catch((error) => {
              if (error instanceof InvalidSettingsPatchError) {
                return Effect.fail(error);
              }

              const code = getPostgresErrorCode(error);

              if (attempt < 2 && (code === "40001" || code === "23505")) {
                return applyOperationsAttempt(userId, operations, attempt + 1);
              }

              return Effect.fail(persistenceError(error));
            }),
          );

      return SettingsDocumentsRepository.of({
        findDocuments: (userId, domains, scopes) => {
          const scopePredicates = scopes.map((scope) =>
            and(
              eq(userSettingDocumentTable.scopeType, scope.type),
              eq(userSettingDocumentTable.scopeId, scope.id),
            ),
          );

          return database
            .select()
            .from(userSettingDocumentTable)
            .where(
              and(
                eq(userSettingDocumentTable.userId, userId),
                inArray(userSettingDocumentTable.domain, domains),
                or(...scopePredicates),
              ),
            )
            .orderBy(
              userSettingDocumentTable.scopeType,
              userSettingDocumentTable.scopeId,
            )
            .pipe(Effect.mapError(persistenceError));
        },
        hasActiveGuildMembership: (userId, guildId) =>
          database
            .select({ id: memberTable.id })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.globalUserId, userId),
                eq(memberTable.guildId, guildId),
                eq(memberTable.active, true),
              ),
            )
            .limit(1)
            .pipe(
              Effect.map((rows) => rows.length > 0),
              Effect.mapError(persistenceError),
            ),
        findActiveGuildMemberships: (userId, guildIds) =>
          guildIds.length === 0
            ? Effect.succeed([])
            : database
                .select({ guildId: memberTable.guildId })
                .from(memberTable)
                .where(
                  and(
                    eq(memberTable.globalUserId, userId),
                    inArray(memberTable.guildId, [...guildIds]),
                    eq(memberTable.active, true),
                  ),
                )
                .pipe(
                  Effect.map((rows) => [
                    ...new Set(rows.map((row) => row.guildId)),
                  ]),
                  Effect.mapError(persistenceError),
                ),
        applyOperations: (userId, operations) =>
          // An empty batch would build a lock predicate matching every
          // document of the user.
          operations.length === 0
            ? Effect.void
            : applyOperationsAttempt(userId, operations, 0),
      });
    }),
  );
}
