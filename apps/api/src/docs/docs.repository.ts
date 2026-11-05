import { stableJsonStringify } from "@lootlog/schema/stable-json";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
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
} from "#src/database/drizzle/guild-document.schema";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { findMemberNames } from "#src/members/member-names";
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

export type StoredDocument = typeof guildDocumentTable.$inferSelect;

export type DocumentSummary = Omit<
  StoredDocument,
  "content" | "deletedAt" | "deletedByDiscordId"
>;

export type StoredDocumentHistory =
  typeof guildDocumentHistoryTable.$inferSelect;

export type DocumentHistorySummary = Omit<StoredDocumentHistory, "content">;

type DocumentListing = {
  readonly guild: Pick<typeof guildTable.$inferSelect, "documentLimit"> | null;
  readonly used: number;
  readonly trashed: number;
  readonly documents: ReadonlyArray<DocumentSummary>;
};

export interface DocsRepositoryService {
  readonly listDocuments: (
    guildId: string,
  ) => Effect.Effect<DocumentListing, DocsRepositoryFailure>;
  readonly createDocument: (options: {
    guildId: string;
    discordId: string;
    title: string;
    content: GuildDocumentContent;
    defaultLimit: number;
  }) => Effect.Effect<StoredDocument, DocsRepositoryFailure>;
  readonly findActive: (
    guildId: string,
    documentId: string,
  ) => Effect.Effect<StoredDocument | null, DocsRepositoryFailure>;
  readonly updateDocument: (options: {
    guildId: string;
    documentId: string;
    discordId: string;
    title: string;
    content: GuildDocumentContent;
    /** Rejects the save when another one advanced the document past it. */
    baseVersion?: number;
  }) => Effect.Effect<StoredDocument, DocsRepositoryFailure>;
  readonly listHistory: (
    guildId: string,
    documentId: string,
  ) => Effect.Effect<
    ReadonlyArray<DocumentHistorySummary>,
    DocsRepositoryFailure
  >;
  readonly findHistory: (
    guildId: string,
    documentId: string,
    historyId: string,
  ) => Effect.Effect<StoredDocumentHistory | null, DocsRepositoryFailure>;
  readonly listTrash: (
    guildId: string,
  ) => Effect.Effect<ReadonlyArray<StoredDocument>, DocsRepositoryFailure>;
  readonly changeTrashState: (options: {
    guildId: string;
    documentId: string;
    discordId: string;
    action: "DELETE" | "RESTORE";
  }) => Effect.Effect<void, DocsRepositoryFailure>;
  readonly purge: (
    guildId: string,
    documentId: string,
  ) => Effect.Effect<void, DocsRepositoryFailure>;
  readonly findEditorNames: (
    guildId: string,
    discordIds: Iterable<string>,
  ) => Effect.Effect<ReadonlyMap<string, string>, DocsRepositoryFailure>;
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

const documentHistoryValues = (
  document: StoredDocument,
  action: StoredDocumentHistory["action"],
): typeof guildDocumentHistoryTable.$inferInsert => ({
  id: Bun.randomUUIDv7(),
  documentId: document.id,
  guildId: document.guildId,
  version: document.version,
  title: document.title,
  content: document.content,
  action,
  actorDiscordId: document.updatedByDiscordId,
  editedAt: document.updatedAt,
});

/**
 * Every save stores the full content, so each document keeps only its newest
 * entries; the `record_lifecycle` migration pruned older rows once.
 */
export const DOCUMENT_HISTORY_RETAINED_ENTRIES = 100;

const insertDocumentHistory = Effect.fnUntraced(function* (
  transaction: Pick<DocsDatabase, "insert" | "select" | "delete">,
  document: StoredDocument,
  action: StoredDocumentHistory["action"],
) {
  yield* transaction
    .insert(guildDocumentHistoryTable)
    .values(documentHistoryValues(document, action));

  const staleHistory = yield* transaction
    .select({ id: guildDocumentHistoryTable.id })
    .from(guildDocumentHistoryTable)
    .where(eq(guildDocumentHistoryTable.documentId, document.id))
    .orderBy(
      desc(guildDocumentHistoryTable.version),
      desc(guildDocumentHistoryTable.editedAt),
      desc(guildDocumentHistoryTable.id),
    )
    .offset(DOCUMENT_HISTORY_RETAINED_ENTRIES);

  if (staleHistory.length > 0) {
    yield* transaction.delete(guildDocumentHistoryTable).where(
      inArray(
        guildDocumentHistoryTable.id,
        staleHistory.map(({ id }) => id),
      ),
    );
  }
});

function makeDocsRepository(database: DocsDatabase): DocsRepositoryService {
  const protect = <A, E>(effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((error): DocsRepositoryFailure =>
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

  const findEditorNames: DocsRepositoryService["findEditorNames"] = (
    guildId,
    discordIds,
  ) =>
    protect(findMemberNames(database, guildId, { discordIds })).pipe(
      Effect.map(({ byDiscordId }) => byDiscordId),
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
                createdByDiscordId: guildDocumentTable.createdByDiscordId,
                updatedByDiscordId: guildDocumentTable.updatedByDiscordId,
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
              id: Bun.randomUUIDv7(),
              guildId: options.guildId,
              title: options.title,
              content: options.content,
              version: 1,
              createdByDiscordId: options.discordId,
              updatedByDiscordId: options.discordId,
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

          yield* insertDocumentHistory(transaction, document, "SAVE");

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
            .limit(1)
            // Concurrent saves of one document check its version in turn.
            .for("update");

          const document = rows[0];

          if (!document)
            return yield* Effect.fail(
              new ResourceNotFoundError("Document not found"),
            );

          if (
            options.baseVersion !== undefined &&
            options.baseVersion !== document.version
          )
            return yield* Effect.fail(
              new ResourceConflictError("Document has a newer version"),
            );

          if (
            document.title === options.title &&
            stableJsonStringify(document.content) ===
              stableJsonStringify(options.content)
          ) {
            return document;
          }

          const now = new Date(yield* Clock.currentTimeMillis);

          const updatedRows = yield* transaction
            .update(guildDocumentTable)
            .set({
              title: options.title,
              content: options.content,
              updatedByDiscordId: options.discordId,
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

          yield* insertDocumentHistory(transaction, updated, "SAVE");

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
            actorDiscordId: guildDocumentHistoryTable.actorDiscordId,
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
              deletedByDiscordId:
                options.action === "DELETE" ? options.discordId : null,
              updatedByDiscordId: options.discordId,
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

          yield* insertDocumentHistory(transaction, updated, options.action);
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
    findEditorNames,
  });
}
