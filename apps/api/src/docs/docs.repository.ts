import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import {
  ResourceConflictError,
  ApplicationError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildDocumentHistoryTable,
  guildDocumentTable,
  guildTable,
  memberTable,
} from "#src/database/drizzle/schema";
import type { GuildDocumentContent } from "./guild-document-content.schema.js";

type DocsDatabase = typeof ApiDatabase.Service;
type WriteDatabase = Pick<
  DocsDatabase,
  "delete" | "insert" | "select" | "update"
>;

export class DocsPersistenceError extends TaggedErrorClass<DocsPersistenceError>()(
  "DocsPersistenceError",
  { cause: Schema.Defect() },
) {}

export type DocsRepositoryFailure = ApplicationError | DocsPersistenceError;

export interface DocsRepositoryService {
  readonly listDocuments: (
    guildId: string,
  ) => Effect.Effect<unknown, DocsRepositoryFailure>;
  readonly createDocument: (options: {
    guildId: string;
    memberId: string;
    title: string;
    content: GuildDocumentContent;
    defaultLimit: number;
  }) => Effect.Effect<unknown, DocsRepositoryFailure>;
  readonly findActive: (
    guildId: string,
    documentId: string,
  ) => Effect.Effect<unknown | null, DocsRepositoryFailure>;
  readonly updateDocument: (options: {
    guildId: string;
    documentId: string;
    memberId: string;
    title: string;
    content: GuildDocumentContent;
  }) => Effect.Effect<unknown, DocsRepositoryFailure>;
  readonly listHistory: (
    guildId: string,
    documentId: string,
  ) => Effect.Effect<ReadonlyArray<unknown>, DocsRepositoryFailure>;
  readonly findHistory: (
    guildId: string,
    documentId: string,
    historyId: string,
  ) => Effect.Effect<unknown | null, DocsRepositoryFailure>;
  readonly listTrash: (
    guildId: string,
  ) => Effect.Effect<ReadonlyArray<unknown>, DocsRepositoryFailure>;
  readonly changeTrashState: (options: {
    guildId: string;
    documentId: string;
    memberId: string;
    action: "DELETE" | "RESTORE";
  }) => Effect.Effect<void, DocsRepositoryFailure>;
  readonly purge: (
    guildId: string,
    documentId: string,
  ) => Effect.Effect<void, DocsRepositoryFailure>;
  readonly findEditors: (
    guildId: string,
    memberIds: ReadonlyArray<string>,
  ) => Effect.Effect<
    ReadonlyArray<{ userId: string; name: string }>,
    DocsRepositoryFailure
  >;
}

export class DocsRepository extends Context.Service<
  DocsRepository,
  DocsRepositoryService
>()("@lootlog/api/docs/repository") {
  static readonly layerDatabase = Layer.effect(
    DocsRepository,
    Effect.map(ApiDatabase, makeDocsRepository),
  );
}

function makeDocsRepository(database: DocsDatabase): DocsRepositoryService {
  const protect = <A, E>(effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (error): DocsRepositoryFailure =>
          error instanceof ApplicationError
            ? error
            : new DocsPersistenceError({ cause: error }),
      ),
    );

  const countDocuments = (guildId: string, trashedOnly = false) =>
    database
      .select({ value: count() })
      .from(guildDocumentTable)
      .where(
        and(
          eq(guildDocumentTable.guildId, guildId),
          trashedOnly ? isNotNull(guildDocumentTable.deletedAt) : undefined,
        ),
      );

  const transaction = <A, E>(
    operationId: string,
    body: (transaction: WriteDatabase) => Effect.Effect<A, E>,
  ) =>
    protect(database.transaction(body)).pipe(
      Effect.withSpan(operationId, {
        attributes: { adapter: "docs.drizzle", retryCount: 0 },
      }),
    );

  const findEditors: DocsRepositoryService["findEditors"] = (
    guildId,
    memberIds,
  ) =>
    memberIds.length === 0
      ? Effect.succeed([])
      : protect(
          database
            .select({ userId: memberTable.userId, name: memberTable.name })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.guildId, guildId),
                inArray(memberTable.userId, [...memberIds]),
              ),
            ),
        );

  return DocsRepository.of({
    listDocuments: (guildId) =>
      protect(
        Effect.all(
          {
            guilds: database
              .select({ documentLimit: guildTable.documentLimit })
              .from(guildTable)
              .where(eq(guildTable.id, guildId))
              .limit(1),
            usedRows: countDocuments(guildId),
            trashedRows: countDocuments(guildId, true),
            documents: database
              .select({
                id: guildDocumentTable.id,
                guildId: guildDocumentTable.guildId,
                title: guildDocumentTable.title,
                version: guildDocumentTable.version,
                createdByMemberId: guildDocumentTable.createdByMemberId,
                updatedByMemberId: guildDocumentTable.updatedByMemberId,
                createdAt: guildDocumentTable.createdAt,
                updatedAt: guildDocumentTable.updatedAt,
              })
              .from(guildDocumentTable)
              .where(
                and(
                  eq(guildDocumentTable.guildId, guildId),
                  isNull(guildDocumentTable.deletedAt),
                ),
              )
              .orderBy(desc(guildDocumentTable.updatedAt)),
          },
          { concurrency: "unbounded" },
        ),
      ).pipe(
        Effect.map(({ guilds, usedRows, trashedRows, documents }) => ({
          guild: guilds[0] ?? null,
          used: usedRows[0]?.value ?? 0,
          trashed: trashedRows[0]?.value ?? 0,
          documents,
        })),
      ),
    createDocument: (options) =>
      transaction("docs.create.transaction", (transaction) =>
        Effect.gen(function* () {
          const guildRows = yield* transaction
            .select({ documentLimit: guildTable.documentLimit })
            .from(guildTable)
            .where(eq(guildTable.id, options.guildId))
            .limit(1);
          const guild = guildRows[0];
          if (!guild)
            return yield* Effect.fail(
              new ResourceNotFoundError("Guild not found"),
            );
          const usedRows = yield* transaction
            .select({ value: count() })
            .from(guildDocumentTable)
            .where(eq(guildDocumentTable.guildId, options.guildId));
          const limit = Math.max(
            0,
            guild.documentLimit ?? options.defaultLimit,
          );
          if ((usedRows[0]?.value ?? 0) >= limit) {
            return yield* Effect.fail(
              new ResourceConflictError("Guild document limit reached"),
            );
          }
          const now = new Date(yield* Clock.currentTimeMillis);
          const rows = yield* transaction
            .insert(guildDocumentTable)
            .values({
              id: randomUUID(),
              guildId: options.guildId,
              title: options.title,
              content: options.content,
              version: 1,
              createdByMemberId: options.memberId,
              updatedByMemberId: options.memberId,
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          const document = rows[0];
          if (!document) {
            return yield* Effect.fail(
              new DocsPersistenceError({ cause: "Document was not returned" }),
            );
          }
          yield* transaction.insert(guildDocumentHistoryTable).values({
            id: randomUUID(),
            documentId: document.id,
            guildId: options.guildId,
            version: document.version,
            title: document.title,
            content: document.content,
            action: "SAVE",
            actorMemberId: options.memberId,
            editedAt: now,
          });
          return document;
        }),
      ),
    findActive: (guildId, documentId) =>
      protect(
        database
          .select()
          .from(guildDocumentTable)
          .where(
            and(
              eq(guildDocumentTable.id, documentId),
              eq(guildDocumentTable.guildId, guildId),
              isNull(guildDocumentTable.deletedAt),
            ),
          )
          .limit(1),
      ).pipe(Effect.map((rows) => rows[0] ?? null)),
    updateDocument: (options) =>
      transaction("docs.update.transaction", (transaction) =>
        Effect.gen(function* () {
          const rows = yield* transaction
            .select()
            .from(guildDocumentTable)
            .where(
              and(
                eq(guildDocumentTable.id, options.documentId),
                eq(guildDocumentTable.guildId, options.guildId),
                isNull(guildDocumentTable.deletedAt),
              ),
            )
            .limit(1);
          const document = rows[0];
          if (!document)
            return yield* Effect.fail(
              new ResourceNotFoundError("Document not found"),
            );
          if (
            document.title === options.title &&
            JSON.stringify(document.content) === JSON.stringify(options.content)
          ) {
            return document;
          }
          const now = new Date(yield* Clock.currentTimeMillis);
          const updatedRows = yield* transaction
            .update(guildDocumentTable)
            .set({
              title: options.title,
              content: options.content,
              updatedByMemberId: options.memberId,
              version: sql`${guildDocumentTable.version} + 1`,
              updatedAt: now,
            })
            .where(eq(guildDocumentTable.id, options.documentId))
            .returning();
          const updated = updatedRows[0];
          if (!updated) {
            return yield* Effect.fail(
              new DocsPersistenceError({ cause: "Document was not returned" }),
            );
          }
          yield* transaction.insert(guildDocumentHistoryTable).values({
            id: randomUUID(),
            documentId: options.documentId,
            guildId: options.guildId,
            version: updated.version,
            title: updated.title,
            content: updated.content,
            action: "SAVE",
            actorMemberId: options.memberId,
            editedAt: now,
          });
          return updated;
        }),
      ),
    listHistory: (guildId, documentId) =>
      protect(
        database
          .select({
            id: guildDocumentHistoryTable.id,
            documentId: guildDocumentHistoryTable.documentId,
            guildId: guildDocumentHistoryTable.guildId,
            version: guildDocumentHistoryTable.version,
            title: guildDocumentHistoryTable.title,
            action: guildDocumentHistoryTable.action,
            actorMemberId: guildDocumentHistoryTable.actorMemberId,
            editedAt: guildDocumentHistoryTable.editedAt,
          })
          .from(guildDocumentHistoryTable)
          .where(
            and(
              eq(guildDocumentHistoryTable.documentId, documentId),
              eq(guildDocumentHistoryTable.guildId, guildId),
            ),
          )
          .orderBy(desc(guildDocumentHistoryTable.editedAt)),
      ),
    findHistory: (guildId, documentId, historyId) =>
      protect(
        database
          .select()
          .from(guildDocumentHistoryTable)
          .where(
            and(
              eq(guildDocumentHistoryTable.id, historyId),
              eq(guildDocumentHistoryTable.documentId, documentId),
              eq(guildDocumentHistoryTable.guildId, guildId),
            ),
          )
          .limit(1),
      ).pipe(Effect.map((rows) => rows[0] ?? null)),
    listTrash: (guildId) =>
      protect(
        database
          .select()
          .from(guildDocumentTable)
          .where(
            and(
              eq(guildDocumentTable.guildId, guildId),
              isNotNull(guildDocumentTable.deletedAt),
            ),
          )
          .orderBy(desc(guildDocumentTable.deletedAt)),
      ),
    changeTrashState: (options) =>
      transaction("docs.changeTrashState.transaction", (transaction) =>
        Effect.gen(function* () {
          const predicate =
            options.action === "DELETE"
              ? and(
                  eq(guildDocumentTable.id, options.documentId),
                  eq(guildDocumentTable.guildId, options.guildId),
                  isNull(guildDocumentTable.deletedAt),
                )
              : and(
                  eq(guildDocumentTable.id, options.documentId),
                  eq(guildDocumentTable.guildId, options.guildId),
                );
          const rows = yield* transaction
            .select()
            .from(guildDocumentTable)
            .where(predicate)
            .limit(1);
          const document = rows[0];
          if (!document)
            return yield* Effect.fail(
              new ResourceNotFoundError("Document not found"),
            );
          if (options.action === "RESTORE" && !document.deletedAt) {
            return yield* Effect.fail(
              new ResourceConflictError("Document is not in trash"),
            );
          }
          const now = new Date(yield* Clock.currentTimeMillis);
          const updatedRows = yield* transaction
            .update(guildDocumentTable)
            .set({
              deletedAt: options.action === "DELETE" ? now : null,
              deletedByMemberId:
                options.action === "DELETE" ? options.memberId : null,
              updatedByMemberId: options.memberId,
              updatedAt: now,
            })
            .where(eq(guildDocumentTable.id, options.documentId))
            .returning();
          const updated = updatedRows[0];
          if (!updated) {
            return yield* Effect.fail(
              new DocsPersistenceError({ cause: "Document was not returned" }),
            );
          }
          yield* transaction.insert(guildDocumentHistoryTable).values({
            id: randomUUID(),
            documentId: options.documentId,
            guildId: options.guildId,
            version: updated.version,
            title: updated.title,
            content: updated.content,
            action: options.action,
            actorMemberId: options.memberId,
            editedAt: now,
          });
        }),
      ),
    purge: (guildId, documentId) =>
      Effect.gen(function* () {
        const rows = yield* protect(
          database
            .select({
              id: guildDocumentTable.id,
              deletedAt: guildDocumentTable.deletedAt,
            })
            .from(guildDocumentTable)
            .where(
              and(
                eq(guildDocumentTable.id, documentId),
                eq(guildDocumentTable.guildId, guildId),
              ),
            )
            .limit(1),
        );
        const document = rows[0];
        if (!document)
          return yield* Effect.fail(
            new ResourceNotFoundError("Document not found"),
          );
        if (!document.deletedAt) {
          return yield* Effect.fail(
            new ResourceConflictError("Document is not in trash"),
          );
        }
        yield* protect(
          database
            .delete(guildDocumentTable)
            .where(eq(guildDocumentTable.id, documentId)),
        );
      }).pipe(
        Effect.withSpan("docs.purge", {
          attributes: { adapter: "docs.drizzle", retryCount: 0 },
        }),
      ),
    findEditors,
  });
}
