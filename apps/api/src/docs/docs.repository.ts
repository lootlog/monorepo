import { randomUUID } from "node:crypto";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  guildDocumentHistoryTable,
  guildDocumentTable,
  guildTable,
  memberTable,
} from "#src/database/drizzle/schema";
import type { GuildDocumentContent } from "./dto/guild-document-content.schema.js";

type WriteDatabase = Pick<
  typeof ApiDatabase.Service,
  "delete" | "insert" | "select" | "update"
>;

@Injectable()
export class DocsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async listDocuments(guildId: string) {
    const [guilds, usedRows, trashedRows, documents] = await Promise.all([
      this.run((database) =>
        database
          .select({ documentLimit: guildTable.documentLimit })
          .from(guildTable)
          .where(eq(guildTable.id, guildId))
          .limit(1),
      ),
      this.countDocuments(guildId),
      this.countDocuments(guildId, true),
      this.run((database) =>
        database
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
      ),
    ]);
    return {
      guild: guilds[0] ?? null,
      used: usedRows[0]?.value ?? 0,
      trashed: trashedRows[0]?.value ?? 0,
      documents,
    };
  }

  createDocument(options: {
    guildId: string;
    memberId: string;
    title: string;
    content: GuildDocumentContent;
    defaultLimit: number;
  }) {
    return this.transaction((transaction) =>
      Effect.gen(function* () {
        const guildRows = yield* transaction
          .select({ documentLimit: guildTable.documentLimit })
          .from(guildTable)
          .where(eq(guildTable.id, options.guildId))
          .limit(1);
        const guild = guildRows[0];
        if (!guild)
          return yield* Effect.die(new NotFoundException("Guild not found"));
        const usedRows = yield* transaction
          .select({ value: count() })
          .from(guildDocumentTable)
          .where(eq(guildDocumentTable.guildId, options.guildId));
        const limit = Math.max(0, guild.documentLimit ?? options.defaultLimit);
        if ((usedRows[0]?.value ?? 0) >= limit) {
          return yield* Effect.die(
            new ConflictException("Guild document limit reached"),
          );
        }
        const now = new Date();
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
        if (!document) return yield* Effect.die("Document was not returned");
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
    );
  }

  async findActive(guildId: string, documentId: string) {
    const rows = await this.run((database) =>
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
    );
    return rows[0] ?? null;
  }

  updateDocument(options: {
    guildId: string;
    documentId: string;
    memberId: string;
    title: string;
    content: GuildDocumentContent;
  }) {
    return this.transaction((transaction) =>
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
        if (!document) {
          return yield* Effect.die(new NotFoundException("Document not found"));
        }
        if (
          document.title === options.title &&
          JSON.stringify(document.content) === JSON.stringify(options.content)
        ) {
          return document;
        }
        const now = new Date();
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
        if (!updated) return yield* Effect.die("Document was not returned");
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
    );
  }

  listHistory(guildId: string, documentId: string) {
    return this.run((database) =>
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
    );
  }

  async findHistory(guildId: string, documentId: string, historyId: string) {
    const rows = await this.run((database) =>
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
    );
    return rows[0] ?? null;
  }

  listTrash(guildId: string) {
    return this.run((database) =>
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
    );
  }

  changeTrashState(options: {
    guildId: string;
    documentId: string;
    memberId: string;
    action: "DELETE" | "RESTORE";
  }) {
    return this.transaction((transaction) =>
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
        if (!document) {
          return yield* Effect.die(new NotFoundException("Document not found"));
        }
        if (options.action === "RESTORE" && !document.deletedAt) {
          return yield* Effect.die(
            new ConflictException("Document is not in trash"),
          );
        }
        const now = new Date();
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
        if (!updated) return yield* Effect.die("Document was not returned");
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
    );
  }

  async purge(guildId: string, documentId: string) {
    const rows = await this.run((database) =>
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
    if (!document) throw new NotFoundException("Document not found");
    if (!document.deletedAt) {
      throw new ConflictException("Document is not in trash");
    }
    await this.run((database) =>
      database
        .delete(guildDocumentTable)
        .where(eq(guildDocumentTable.id, documentId)),
    );
  }

  findEditors(guildId: string, memberIds: ReadonlyArray<string>) {
    if (memberIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
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
  }

  private countDocuments(guildId: string, trashedOnly = false) {
    return this.run((database) =>
      database
        .select({ value: count() })
        .from(guildDocumentTable)
        .where(
          and(
            eq(guildDocumentTable.guildId, guildId),
            trashedOnly ? isNotNull(guildDocumentTable.deletedAt) : undefined,
          ),
        ),
    );
  }

  private transaction<A, E>(
    body: (database: WriteDatabase) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) => database.transaction(body)),
    );
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }
}
