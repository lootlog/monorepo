import { vi } from "#test/bun-test";
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { Effect } from "effect";
import { makeDocsService, type DocsService } from "./docs.service.js";

const baseContent = {
  root: {
    children: [],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
};

const createDocumentRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "doc-1",
  guildId: "guild-1",
  title: "Plan",
  content: baseContent,
  version: 1,
  createdByMemberId: "discord-1",
  updatedByMemberId: "discord-1",
  deletedAt: null,
  deletedByMemberId: null,
  createdAt: new Date("2026-06-22T10:00:00.000Z"),
  updatedAt: new Date("2026-06-22T10:00:00.000Z"),
  ...overrides,
});

const createHistoryRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "history-1",
  documentId: "doc-1",
  guildId: "guild-1",
  version: 1,
  title: "Plan",
  content: baseContent,
  action: "SAVE",
  actorMemberId: "discord-1",
  editedAt: new Date("2026-06-22T10:00:00.000Z"),
  ...overrides,
});

const createDatabaseMock = () => {
  const database = {
    $transaction: vi.fn<<T>(callback: (tx: unknown) => T) => T>(),
    guild: {
      findUnique: vi.fn<(...args: unknown[]) => unknown>(),
    },
    guildDocument: {
      count: vi.fn<(...args: unknown[]) => unknown>(),
      create: vi.fn<(...args: unknown[]) => unknown>(),
      findFirst: vi.fn<(...args: unknown[]) => unknown>(),
      findMany: vi.fn<(...args: unknown[]) => unknown>(),
      update: vi.fn<(...args: unknown[]) => unknown>(),
      delete: vi.fn<(...args: unknown[]) => unknown>(),
    },
    guildDocumentHistory: {
      create: vi.fn<(...args: unknown[]) => unknown>(),
      findFirst: vi.fn<(...args: unknown[]) => unknown>(),
      findMany: vi.fn<(...args: unknown[]) => unknown>(),
    },
    member: {
      findMany: vi.fn<(...args: unknown[]) => unknown>(),
    },
  };

  database.$transaction.mockImplementation((callback) => callback(database));

  return database;
};

const createRepositoryAdapter = (
  database: ReturnType<typeof createDatabaseMock>,
) => ({
  async listDocuments(guildId: string) {
    const [guild, used, trashed, documents] = await Promise.all([
      database.guild.findUnique({
        where: { id: guildId },
        select: { documentLimit: true },
      }),
      database.guildDocument.count({ where: { guildId } }),
      database.guildDocument.count({
        where: { guildId, deletedAt: { not: null } },
      }),
      database.guildDocument.findMany({
        where: { guildId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return { guild, used, trashed, documents };
  },
  createDocument(options: {
    guildId: string;
    memberId: string;
    title: string;
    content: unknown;
    defaultLimit: number;
  }) {
    return database.$transaction(async (tx: typeof database) => {
      const guild = await tx.guild.findUnique({
        where: { id: options.guildId },
      });
      if (!guild) throw new ResourceNotFoundError("Guild not found");
      const used = await tx.guildDocument.count({
        where: { guildId: options.guildId },
      });
      if (used >= Math.max(0, guild.documentLimit ?? options.defaultLimit)) {
        throw new ResourceConflictError("Guild document limit reached");
      }
      const document = await tx.guildDocument.create({
        data: {
          guildId: options.guildId,
          title: options.title,
          content: options.content,
          createdByMemberId: options.memberId,
          updatedByMemberId: options.memberId,
        },
      });
      await tx.guildDocumentHistory.create({
        data: {
          documentId: document.id,
          guildId: options.guildId,
          version: document.version,
          title: document.title,
          content: document.content,
          action: "SAVE",
          actorMemberId: options.memberId,
        },
      });
      return document;
    });
  },
  findActive(guildId: string, documentId: string) {
    return database.guildDocument.findFirst({
      where: { id: documentId, guildId, deletedAt: null },
    });
  },
  updateDocument(options: {
    guildId: string;
    documentId: string;
    memberId: string;
    title: string;
    content: unknown;
  }) {
    return database.$transaction(async (tx: typeof database) => {
      const document = await tx.guildDocument.findFirst({
        where: {
          id: options.documentId,
          guildId: options.guildId,
          deletedAt: null,
        },
      });
      if (!document) throw new ResourceNotFoundError("Document not found");
      if (
        document.title === options.title &&
        JSON.stringify(document.content) === JSON.stringify(options.content)
      )
        return document;
      const updated = await tx.guildDocument.update({
        where: { id: options.documentId },
        data: {
          title: options.title,
          content: options.content,
          updatedByMemberId: options.memberId,
          version: { increment: 1 },
        },
      });
      await tx.guildDocumentHistory.create({
        data: {
          documentId: options.documentId,
          guildId: options.guildId,
          version: updated.version,
          title: updated.title,
          content: updated.content,
          action: "SAVE",
          actorMemberId: options.memberId,
        },
      });
      return updated;
    });
  },
  listHistory(guildId: string, documentId: string) {
    return database.guildDocumentHistory.findMany({
      where: { documentId, guildId },
      orderBy: { editedAt: "desc" },
    });
  },
  findHistory(guildId: string, documentId: string, historyId: string) {
    return database.guildDocumentHistory.findFirst({
      where: { id: historyId, documentId, guildId },
    });
  },
  listTrash(guildId: string) {
    return database.guildDocument.findMany({
      where: { guildId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    });
  },
  changeTrashState(options: {
    guildId: string;
    documentId: string;
    memberId: string;
    action: "DELETE" | "RESTORE";
  }) {
    return database.$transaction(async (tx: typeof database) => {
      const document = await tx.guildDocument.findFirst({
        where:
          options.action === "DELETE"
            ? {
                id: options.documentId,
                guildId: options.guildId,
                deletedAt: null,
              }
            : { id: options.documentId, guildId: options.guildId },
      });
      if (!document) throw new ResourceNotFoundError("Document not found");
      if (options.action === "RESTORE" && !document.deletedAt) {
        throw new ResourceConflictError("Document is not in trash");
      }
      const now = new Date();
      const data =
        options.action === "DELETE"
          ? {
              deletedAt: now,
              deletedByMemberId: options.memberId,
              updatedByMemberId: options.memberId,
            }
          : {
              deletedAt: null,
              deletedByMemberId: null,
              updatedByMemberId: options.memberId,
            };
      const updated = await tx.guildDocument.update({
        where: { id: options.documentId },
        data,
      });
      await tx.guildDocumentHistory.create({
        data: {
          documentId: options.documentId,
          guildId: options.guildId,
          version: updated.version,
          title: updated.title,
          content: updated.content,
          action: options.action,
          actorMemberId: options.memberId,
          editedAt: now,
        },
      });
    });
  },
  async purge(guildId: string, documentId: string) {
    const document = await database.guildDocument.findFirst({
      where: { id: documentId, guildId },
    });
    if (!document) throw new ResourceNotFoundError("Document not found");
    if (!document.deletedAt)
      throw new ResourceConflictError("Document is not in trash");
    await database.guildDocument.delete({ where: { id: documentId } });
  },
  findEditors(guildId: string, memberIds: string[]) {
    return database.member.findMany({
      where: { guildId, userId: { in: memberIds } },
      select: { userId: true, name: true },
    });
  },
});

type PromiseDocsService = {
  [Key in keyof DocsService]: DocsService[Key] extends (
    ...arguments_: infer Arguments
  ) => Effect.Effect<infer Success, infer _Failure>
    ? (...arguments_: Arguments) => Promise<Success>
    : never;
};

const createPromiseDocsService = (
  repository: ReturnType<typeof createRepositoryAdapter>,
): PromiseDocsService => {
  const effectRepository = new Proxy(repository, {
    get(target, property) {
      const operation = Reflect.get(target, property) as (
        ...arguments_: unknown[]
      ) => Promise<unknown>;
      return (...arguments_: unknown[]) =>
        Effect.tryPromise({
          try: () => Reflect.apply(operation, target, arguments_),
          catch: (error) => error,
        });
    },
  });
  const effectService = makeDocsService(effectRepository as never);
  return new Proxy(effectService, {
    get(target, property) {
      const operation = Reflect.get(target, property) as (
        ...arguments_: unknown[]
      ) => Effect.Effect<unknown, unknown>;
      return (...arguments_: unknown[]) =>
        Effect.runPromise(Reflect.apply(operation, target, arguments_));
    },
  }) as PromiseDocsService;
};

describe("docs Effect module", () => {
  let database: ReturnType<typeof createDatabaseMock>;
  let service: PromiseDocsService;

  beforeEach(() => {
    database = createDatabaseMock();
    service = createPromiseDocsService(createRepositoryAdapter(database));
    database.member.findMany.mockResolvedValue([]);
    vi.clearAllMocks();
  });

  it("returns document summaries with the guild document limit", async () => {
    const document = createDocumentRecord();

    database.guild.findUnique.mockResolvedValue({ documentLimit: 50 });
    database.guildDocument.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    database.guildDocument.findMany.mockResolvedValue([document]);
    database.member.findMany.mockResolvedValue([
      { userId: "discord-1", name: "Kamil" },
    ]);

    const result = await service.listDocuments("guild-1");

    expect(database.guildDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guildId: "guild-1", deletedAt: null },
      }),
    );
    expect(database.member.findMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        userId: { in: ["discord-1"] },
      },
      select: { userId: true, name: true },
    });
    expect(result.limit).toEqual({
      used: 1,
      max: 50,
      trashed: 0,
      canCreate: true,
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "doc-1",
        title: "Plan",
        createdBy: { memberId: "discord-1", name: "Kamil" },
        updatedBy: { memberId: "discord-1", name: "Kamil" },
      }),
    ]);
  });

  it("throws conflict when the guild document limit is reached", async () => {
    database.guild.findUnique.mockResolvedValue({ documentLimit: 1 });
    database.guildDocument.count.mockResolvedValue(1);

    await expect(
      service.createDocument("guild-1", "discord-1", { title: "Plan" }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(database.guildDocument.create).not.toHaveBeenCalled();
    expect(database.guildDocumentHistory.create).not.toHaveBeenCalled();
  });

  it("rejects too long titles before writing", async () => {
    await expect(
      service.createDocument("guild-1", "discord-1", {
        title: "x".repeat(121),
      }),
    ).rejects.toBeInstanceOf(InvalidRequestError);

    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("rejects too long content before writing", async () => {
    const longContent = {
      root: {
        children: [{ text: "x".repeat(250_001), type: "text" }],
      },
    };

    await expect(
      service.updateDocument("guild-1", "doc-1", "discord-1", {
        title: "Plan",
        content: longContent,
      }),
    ).rejects.toBeInstanceOf(InvalidRequestError);

    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("creates an empty document and initial history snapshot", async () => {
    const document = createDocumentRecord();

    database.guild.findUnique.mockResolvedValue({ documentLimit: 50 });
    database.guildDocument.count.mockResolvedValue(0);
    database.guildDocument.create.mockResolvedValue(document);

    const result = await service.createDocument("guild-1", "discord-1", {
      title: " Plan ",
    });

    expect(database.guildDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guildId: "guild-1",
        title: "Plan",
        createdByMemberId: "discord-1",
        updatedByMemberId: "discord-1",
      }),
    });
    expect(database.guildDocumentHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: "doc-1",
        guildId: "guild-1",
        version: 1,
        title: "Plan",
        action: "SAVE",
        actorMemberId: "discord-1",
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: "doc-1",
        title: "Plan",
        content: baseContent,
        version: 1,
      }),
    );
  });

  it("does not create a new history snapshot for no-op saves", async () => {
    const document = createDocumentRecord();

    database.guildDocument.findFirst.mockResolvedValue(document);

    const result = await service.updateDocument(
      "guild-1",
      "doc-1",
      "discord-1",
      {
        title: " Plan ",
        content: baseContent,
      },
    );

    expect(database.guildDocument.update).not.toHaveBeenCalled();
    expect(database.guildDocumentHistory.create).not.toHaveBeenCalled();
    expect(result.version).toBe(1);
  });

  it("increments the document version and stores a snapshot on real saves", async () => {
    const updatedContent = {
      root: {
        children: [{ text: "Nowe ustalenia", type: "text" }],
      },
    };
    const currentDocument = createDocumentRecord();
    const updatedDocument = createDocumentRecord({
      title: "Plan v2",
      content: updatedContent,
      version: 2,
      updatedByMemberId: "discord-2",
    });

    database.guildDocument.findFirst.mockResolvedValue(currentDocument);
    database.guildDocument.update.mockResolvedValue(updatedDocument);

    const result = await service.updateDocument(
      "guild-1",
      "doc-1",
      "discord-2",
      {
        title: "Plan v2",
        content: updatedContent,
      },
    );

    expect(database.guildDocument.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: expect.objectContaining({
        title: "Plan v2",
        updatedByMemberId: "discord-2",
        version: { increment: 1 },
      }),
    });
    expect(database.guildDocumentHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: "doc-1",
        guildId: "guild-1",
        version: 2,
        title: "Plan v2",
        content: updatedContent,
        action: "SAVE",
        actorMemberId: "discord-2",
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        title: "Plan v2",
        content: updatedContent,
        version: 2,
      }),
    );
  });

  it("throws not found for missing history snapshots", async () => {
    database.guildDocument.findFirst.mockResolvedValue(createDocumentRecord());
    database.guildDocumentHistory.findFirst.mockResolvedValue(null);

    await expect(
      service.getHistorySnapshot("guild-1", "doc-1", "history-1"),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("returns history metadata without content in list results", async () => {
    const history = createHistoryRecord();

    database.guildDocument.findFirst.mockResolvedValue(createDocumentRecord());
    database.guildDocumentHistory.findMany.mockResolvedValue([history]);

    const result = await service.listHistory("guild-1", "doc-1");

    expect(result.items).toEqual([
      expect.not.objectContaining({
        content: baseContent,
      }),
    ]);
  });

  it("returns trashed documents with delete metadata", async () => {
    const deletedAt = new Date("2026-06-22T11:00:00.000Z");
    const document = createDocumentRecord({
      deletedAt,
      deletedByMemberId: "discord-2",
    });

    database.guildDocument.findMany.mockResolvedValue([document]);
    database.member.findMany.mockResolvedValue([
      { userId: "discord-1", name: "Kamil" },
      { userId: "discord-2", name: "Wild" },
    ]);

    const result = await service.listTrash("guild-1");

    expect(database.guildDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guildId: "guild-1", deletedAt: { not: null } },
      }),
    );
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "doc-1",
        deletedAt,
        deletedByMemberId: "discord-2",
        deletedBy: { memberId: "discord-2", name: "Wild" },
      }),
    ]);
  });

  it("moves active documents to trash and stores a delete history event", async () => {
    const document = createDocumentRecord();
    const deletedDocument = createDocumentRecord({
      deletedAt: new Date("2026-06-22T11:00:00.000Z"),
      deletedByMemberId: "discord-2",
      updatedByMemberId: "discord-2",
    });

    database.guildDocument.findFirst.mockResolvedValue(document);
    database.guildDocument.update.mockResolvedValue(deletedDocument);

    const result = await service.moveDocumentToTrash(
      "guild-1",
      "doc-1",
      "discord-2",
    );

    expect(database.guildDocument.findFirst).toHaveBeenCalledWith({
      where: { id: "doc-1", guildId: "guild-1", deletedAt: null },
    });
    const updateInput = database.guildDocument.update.mock.calls[0]?.[0];
    expect(updateInput?.where).toEqual({ id: "doc-1" });
    expect(updateInput?.data.deletedAt).toBeInstanceOf(Date);
    expect(updateInput?.data.deletedByMemberId).toBe("discord-2");
    expect(updateInput?.data.updatedByMemberId).toBe("discord-2");

    const historyInput =
      database.guildDocumentHistory.create.mock.calls[0]?.[0];
    expect(historyInput?.data.documentId).toBe("doc-1");
    expect(historyInput?.data.guildId).toBe("guild-1");
    expect(historyInput?.data.version).toBe(1);
    expect(historyInput?.data.action).toBe("DELETE");
    expect(historyInput?.data.actorMemberId).toBe("discord-2");
    expect(result).toEqual({ success: true });
  });

  it("restores trashed documents and stores a restore history event", async () => {
    const deletedDocument = createDocumentRecord({
      deletedAt: new Date("2026-06-22T11:00:00.000Z"),
      deletedByMemberId: "discord-2",
    });
    const restoredDocument = createDocumentRecord({
      updatedByMemberId: "discord-admin",
    });

    database.guildDocument.findFirst.mockResolvedValue(deletedDocument);
    database.guildDocument.update.mockResolvedValue(restoredDocument);

    const result = await service.restoreDocument(
      "guild-1",
      "doc-1",
      "discord-admin",
    );

    expect(database.guildDocument.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: {
        deletedAt: null,
        deletedByMemberId: null,
        updatedByMemberId: "discord-admin",
      },
    });
    const historyInput =
      database.guildDocumentHistory.create.mock.calls[0]?.[0];
    expect(historyInput?.data.documentId).toBe("doc-1");
    expect(historyInput?.data.guildId).toBe("guild-1");
    expect(historyInput?.data.version).toBe(1);
    expect(historyInput?.data.action).toBe("RESTORE");
    expect(historyInput?.data.actorMemberId).toBe("discord-admin");
    expect(result).toEqual({ success: true });
  });

  it("rejects restore for active documents", async () => {
    database.guildDocument.findFirst.mockResolvedValue(createDocumentRecord());

    await expect(
      service.restoreDocument("guild-1", "doc-1", "discord-admin"),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(database.guildDocument.update).not.toHaveBeenCalled();
  });

  it("permanently deletes only trashed documents", async () => {
    database.guildDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      deletedAt: new Date("2026-06-22T11:00:00.000Z"),
    });

    const result = await service.purgeDocument("guild-1", "doc-1");

    expect(database.guildDocument.delete).toHaveBeenCalledWith({
      where: { id: "doc-1" },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects purge for active documents", async () => {
    database.guildDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      deletedAt: null,
    });

    await expect(
      service.purgeDocument("guild-1", "doc-1"),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(database.guildDocument.delete).not.toHaveBeenCalled();
  });
});
