import { SETTINGS_CATALOG } from "@lootlog/domain/settings-documents";
import type {
  SettingsDomain,
  SettingsScope,
} from "@lootlog/schema/settings-documents";
import { Injectable } from "@nestjs/common";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import {
  memberTable,
  userSettingDocumentTable,
} from "../database/drizzle/schema.js";
import type { PatchSettingsDocumentsDto } from "./dto/settings-documents.dto.js";
import { applySettingsPatch } from "./settings-resolver.js";

type JsonRecord = Record<string, unknown>;
type SettingsOperation = PatchSettingsDocumentsDto["operations"][number];

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getPostgresErrorCode = (error: unknown): string | undefined => {
  if (!isRecord(error)) return undefined;
  if (typeof error.code === "string") return error.code;
  return getPostgresErrorCode(error.cause);
};

export class InvalidSettingsPatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSettingsPatchError";
  }
}

@Injectable()
export class SettingsDocumentsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findDocuments(
    userId: string,
    domains: ReadonlyArray<SettingsDomain>,
    scopes: ReadonlyArray<SettingsScope>,
  ) {
    const scopePredicates = scopes.map((scope) =>
      and(
        eq(userSettingDocumentTable.scopeType, scope.type),
        eq(userSettingDocumentTable.scopeId, scope.id),
      ),
    );

    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
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
          ),
      ),
    );
  }

  async hasActiveGuildMembership(userId: string, guildId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
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
          .limit(1),
      ),
    );
    return rows.length > 0;
  }

  async applyOperations(
    userId: string,
    operations: ReadonlyArray<SettingsOperation>,
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.databaseRuntime.runPromise(
          Effect.flatMap(ApiDatabase, (database) =>
            database.transaction((transaction) =>
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
                        eq(
                          userSettingDocumentTable.scopeId,
                          operation.scope.id,
                        ),
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
                    return yield* Effect.fail(
                      new InvalidSettingsPatchError(
                        error instanceof Error
                          ? error.message
                          : "Invalid settings operation",
                      ),
                    );
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
            ),
          ),
        );
        return;
      } catch (error) {
        const code = getPostgresErrorCode(error);
        if (attempt === 2 || (code !== "40001" && code !== "23505")) {
          throw error;
        }
      }
    }
  }
}
