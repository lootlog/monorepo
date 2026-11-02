import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { Effect, Layer, ManagedRuntime } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  guildDocumentHistoryTable,
  guildDocumentTable,
  guildTable,
} from "../src/database/drizzle/schema.js";
import {
  DOCUMENT_HISTORY_RETAINED_ENTRIES,
  DocsPersistenceError,
  DocsRepository,
} from "../src/docs/docs.repository.js";
import { makeDocsService } from "../src/docs/docs.service.js";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "../src/shared/http/http-errors.js";

const runtime = ManagedRuntime.make(
  DocsRepository.layerDatabase.pipe(Layer.provideMerge(ApiDatabaseLive)),
);

const content = { root: { children: [], type: "root", version: 1 } };

const guildId = "docs-integration-guild";

const otherGuildId = "docs-other-guild";

const create = () =>
  runtime.runPromise(
    Effect.flatMap(DocsRepository, (repository) =>
      repository.createDocument({
        guildId,
        memberId: "editor-1",
        title: "Plan",
        content,
        defaultLimit: 50,
      }),
    ),
  );

const documents = () =>
  runtime.runPromise(
    Effect.flatMap(ApiDatabase, (db) =>
      db
        .select()
        .from(guildDocumentTable)
        .where(eq(guildDocumentTable.guildId, guildId)),
    ),
  );

const history = () =>
  runtime.runPromise(
    Effect.flatMap(ApiDatabase, (db) =>
      db
        .select()
        .from(guildDocumentHistoryTable)
        .where(eq(guildDocumentHistoryTable.guildId, guildId))
        .orderBy(asc(guildDocumentHistoryTable.editedAt)),
    ),
  );

const documentId = async () => {
  const row = (await documents())[0];

  if (!row) throw new Error("Expected persisted document");

  return row.id;
};

describe("DocsRepository against migrated PostgreSQL", () => {
  beforeAll(async () => {
    await runtime.runPromise(DocsRepository);
  });
  beforeEach(async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;
        const guildIds = [guildId, otherGuildId];
        // Organization data restricts Guild deletion, so it goes first.
        yield* db
          .delete(guildDocumentHistoryTable)
          .where(inArray(guildDocumentHistoryTable.guildId, guildIds));
        yield* db
          .delete(guildDocumentTable)
          .where(inArray(guildDocumentTable.guildId, guildIds));
        yield* db.delete(guildTable).where(inArray(guildTable.id, guildIds));
        yield* db.insert(guildTable).values([
          {
            id: guildId,
            name: "Documents",
            ownerId: "owner",
            documentLimit: 1,
            updatedAt: new Date(),
          },
          {
            id: otherGuildId,
            name: "Other",
            ownerId: "other",
            updatedAt: new Date(),
          },
        ]);
      }),
    );
  });
  afterAll(async () => {
    await runtime.dispose();
  });

  it("persists initial history and rejects creation when the Organization quota is full", async () => {
    await create();
    const id = await documentId();
    expect(await documents()).toMatchObject([
      { id, title: "Plan", version: 1, content, guildId },
    ]);
    expect(await history()).toMatchObject([
      {
        documentId: id,
        guildId,
        version: 1,
        title: "Plan",
        content,
        action: "SAVE",
        actorMemberId: "editor-1",
      },
    ]);
    await expect(create()).rejects.toBeInstanceOf(ResourceConflictError);
    expect(await documents()).toHaveLength(1);
    expect(await history()).toHaveLength(1);
  });

  it("rolls back the document when its initial history cannot be persisted", async () => {
    const database = await runtime.runPromise(ApiDatabase);
    await runtime.runPromise(
      database.execute(
        sql`CREATE FUNCTION reject_test_document_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected history failure'; END $$`,
      ),
    );
    await runtime.runPromise(
      database.execute(
        sql`CREATE TRIGGER reject_test_document_history BEFORE INSERT ON "GuildDocumentHistory" FOR EACH ROW EXECUTE FUNCTION reject_test_document_history()`,
      ),
    );

    try {
      await expect(create()).rejects.toBeInstanceOf(DocsPersistenceError);
      expect(await documents()).toEqual([]);
      expect(await history()).toEqual([]);
    } finally {
      await runtime.runPromise(
        database.execute(
          sql`DROP TRIGGER reject_test_document_history ON "GuildDocumentHistory"`,
        ),
      );
      await runtime.runPromise(
        database.execute(sql`DROP FUNCTION reject_test_document_history()`),
      );
    }
  });

  it("does not write a no-op save, then increments version and history on a real save", async () => {
    await create();
    const id = await documentId();
    const repository = await runtime.runPromise(DocsRepository);
    const service = makeDocsService(repository);
    await runtime.runPromise(
      service.updateDocument(guildId, id, "editor-2", {
        title: " Plan ",
        content,
      }),
    );
    expect(await documents()).toMatchObject([
      { version: 1, updatedByMemberId: "editor-1" },
    ]);
    expect(await history()).toHaveLength(1);

    const nextContent = {
      root: { children: [{ type: "text", text: "New plan" }] },
    };

    await runtime.runPromise(
      service.updateDocument(guildId, id, "editor-2", {
        title: "Plan v2",
        content: nextContent,
      }),
    );
    expect(await documents()).toMatchObject([
      {
        version: 2,
        title: "Plan v2",
        content: nextContent,
        updatedByMemberId: "editor-2",
      },
    ]);
    expect(await history()).toMatchObject([
      { version: 1, action: "SAVE" },
      {
        version: 2,
        title: "Plan v2",
        content: nextContent,
        action: "SAVE",
        actorMemberId: "editor-2",
      },
    ]);

    // An edit started from version 1 must not overwrite version 2.
    const stale = await runtime.runPromise(
      Effect.flip(
        service.updateDocument(guildId, id, "editor-1", {
          title: "Plan from version 1",
          content,
          baseVersion: 1,
        }),
      ),
    );

    expect(stale).toBeInstanceOf(ResourceConflictError);
    expect(await documents()).toMatchObject([{ version: 2, title: "Plan v2" }]);

    await runtime.runPromise(
      service.updateDocument(guildId, id, "editor-1", {
        title: "Plan v3",
        content,
        baseVersion: 2,
      }),
    );
    expect(await documents()).toMatchObject([{ version: 3, title: "Plan v3" }]);
  });

  it("keeps only the newest history entries of a document", async () => {
    await create();
    const id = await documentId();
    const service = makeDocsService(await runtime.runPromise(DocsRepository));

    for (
      let version = 2;
      version <= DOCUMENT_HISTORY_RETAINED_ENTRIES + 1;
      version += 1
    ) {
      await runtime.runPromise(
        service.updateDocument(guildId, id, "editor-1", {
          title: `Plan v${version}`,
          content,
        }),
      );
    }

    const retained = (await history()).toSorted(
      (left, right) => left.version - right.version,
    );

    expect(retained).toHaveLength(DOCUMENT_HISTORY_RETAINED_ENTRIES);
    expect(retained[0]).toMatchObject({ version: 2, title: "Plan v2" });
    expect(retained.at(-1)).toMatchObject({
      version: DOCUMENT_HISTORY_RETAINED_ENTRIES + 1,
    });
  });

  it("refuses to delete an Organization that still has documents", async () => {
    await create();

    await expect(
      runtime.runPromise(
        Effect.flatMap(ApiDatabase, (db) =>
          db.delete(guildTable).where(eq(guildTable.id, guildId)),
        ),
      ),
    ).rejects.toThrow();
    expect(await documents()).toHaveLength(1);
    expect(await history()).toHaveLength(1);
  });

  it("isolates reads, history, edits, trash and purge by Organization", async () => {
    await create();
    const id = await documentId();
    const snapshot = (await history())[0];

    if (!snapshot) throw new Error("Expected history");
    const repository = await runtime.runPromise(DocsRepository);
    expect(
      await runtime.runPromise(repository.findActive(otherGuildId, id)),
    ).toBeNull();
    expect(
      await runtime.runPromise(repository.listHistory(otherGuildId, id)),
    ).toEqual([]);
    expect(
      await runtime.runPromise(
        repository.findHistory(otherGuildId, id, snapshot.id),
      ),
    ).toBeNull();
    await Promise.all(
      [
        repository.updateDocument({
          guildId: otherGuildId,
          documentId: id,
          memberId: "editor-2",
          title: "Changed",
          content,
        }),
        repository.changeTrashState({
          guildId: otherGuildId,
          documentId: id,
          memberId: "editor-2",
          action: "DELETE",
        }),
        repository.purge(otherGuildId, id),
      ].map(async (operation) => {
        await expect(runtime.runPromise(operation)).rejects.toBeInstanceOf(
          ResourceNotFoundError,
        );
      }),
    );
    expect(await documents()).toMatchObject([
      { title: "Plan", version: 1, deletedAt: null },
    ]);
    expect(await history()).toHaveLength(1);
  });

  it("requires trash before restore or purge and records delete/restore history", async () => {
    await create();
    const id = await documentId();
    const repository = await runtime.runPromise(DocsRepository);
    const service = makeDocsService(repository);
    await expect(
      runtime.runPromise(service.restoreDocument(guildId, id, "editor-2")),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    await expect(
      runtime.runPromise(service.purgeDocument(guildId, id)),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(await history()).toHaveLength(1);
    await runtime.runPromise(
      service.moveDocumentToTrash(guildId, id, "editor-2"),
    );
    expect(await documents()).toMatchObject([
      { deletedAt: expect.any(Date), deletedByMemberId: "editor-2" },
    ]);
    expect(
      await runtime.runPromise(repository.findActive(guildId, id)),
    ).toBeNull();
    expect(
      await runtime.runPromise(repository.listTrash(guildId)),
    ).toHaveLength(1);
    await expect(create()).rejects.toBeInstanceOf(ResourceConflictError);
    await runtime.runPromise(service.restoreDocument(guildId, id, "editor-3"));
    expect(await documents()).toMatchObject([
      {
        deletedAt: null,
        deletedByMemberId: null,
        updatedByMemberId: "editor-3",
      },
    ]);
    expect(await runtime.runPromise(repository.listTrash(guildId))).toEqual([]);
    expect(await history()).toMatchObject([
      { action: "SAVE" },
      { action: "DELETE", actorMemberId: "editor-2" },
      { action: "RESTORE", actorMemberId: "editor-3" },
    ]);
    await runtime.runPromise(
      service.moveDocumentToTrash(guildId, id, "editor-2"),
    );
    await runtime.runPromise(service.purgeDocument(guildId, id));
    expect(await documents()).toEqual([]);
    expect(await history()).toEqual([]);
    await create();
    expect(await documents()).toHaveLength(1);
  });
});
