import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { SETTINGS_CATALOG } from "@lootlog/domain/settings-documents";
import type {
  SettingsDomain,
  SettingsScope,
} from "@lootlog/schema/settings-documents";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import { ApiDatabase } from "../database/drizzle/database.js";
import {
  memberTable,
  userSettingDocumentTable,
} from "../database/drizzle/schema.js";
import type { PatchSettingsDocumentsDto } from "./dto/settings-documents.dto.js";
import { applySettingsPatch } from "./settings-resolver.js";

type JsonRecord = Record<string, unknown>;
type SettingsOperation = PatchSettingsDocumentsDto["operations"][number];
type StoredSettingsDocument = typeof userSettingDocumentTable.$inferSelect;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getPostgresErrorCode = (error: unknown): string | undefined => {
  if (!isRecord(error)) return undefined;
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
              yield* transaction.execute(
                sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`,
              );

              for (const operation of operations) {
                yield* transaction.execute(sql`
                  SELECT "id"
                  FROM "UserSettingDocument"
                  WHERE "userId" = ${userId}
                    AND "domain" = ${operation.domain}
                    AND "scopeType" = ${operation.scope.type}::"SettingsScopeType"
                    AND "scopeId" = ${operation.scope.id}
                  FOR UPDATE
                `);
              }

              for (const operation of operations) {
                const currentRows = yield* transaction
                  .select()
                  .from(userSettingDocumentTable)
                  .where(
                    and(
                      eq(userSettingDocumentTable.userId, userId),
                      eq(userSettingDocumentTable.domain, operation.domain),
                      eq(
                        userSettingDocumentTable.scopeType,
                        operation.scope.type,
                      ),
                      eq(userSettingDocumentTable.scopeId, operation.scope.id),
                    ),
                  )
                  .limit(1);
                const current = currentRows[0];
                let nextOverrides: JsonRecord;
                try {
                  nextOverrides = applySettingsPatch({
                    domain: operation.domain,
                    scope: operation.scope,
                    currentOverrides: isRecord(current?.overrides)
                      ? current.overrides
                      : {},
                    set: operation.set,
                    unset: operation.unset,
                  });
                } catch (error) {
                  return yield* new InvalidSettingsPatchError({
                    message:
                      error instanceof Error
                        ? error.message
                        : "Invalid settings operation",
                  });
                }

                if (Object.keys(nextOverrides).length === 0) {
                  if (current) {
                    yield* transaction
                      .delete(userSettingDocumentTable)
                      .where(eq(userSettingDocumentTable.id, current.id));
                  }
                  continue;
                }

                const data = {
                  overrides: nextOverrides,
                  schemaVersion:
                    SETTINGS_CATALOG[operation.domain].schemaVersion,
                  updatedAt: new Date(),
                };
                if (current) {
                  yield* transaction
                    .update(userSettingDocumentTable)
                    .set(data)
                    .where(eq(userSettingDocumentTable.id, current.id));
                  continue;
                }

                yield* transaction
                  .insert(userSettingDocumentTable)
                  .values({
                    userId,
                    domain: operation.domain,
                    scopeType: operation.scope.type,
                    scopeId: operation.scope.id,
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
        applyOperations: (userId, operations) =>
          applyOperationsAttempt(userId, operations, 0),
      });
    }),
  );
}
