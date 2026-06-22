import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { DocsService } from "./docs.service";

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

const createPrismaMock = () => {
  const prisma = {
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

  prisma.$transaction.mockImplementation((callback) => callback(prisma));

  return prisma;
};

describe("DocsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: DocsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new DocsService(prisma as never);
    prisma.member.findMany.mockResolvedValue([]);
    vi.clearAllMocks();
  });

  it("returns document summaries with the guild document limit", async () => {
    const document = createDocumentRecord();

    prisma.guild.findUnique.mockResolvedValue({ documentLimit: 50 });
    prisma.guildDocument.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.guildDocument.findMany.mockResolvedValue([document]);
    prisma.member.findMany.mockResolvedValue([
      { userId: "discord-1", name: "Kamil" },
    ]);

    const result = await service.listDocuments("guild-1");

    expect(prisma.guildDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guildId: "guild-1", deletedAt: null },
      }),
    );
    expect(prisma.member.findMany).toHaveBeenCalledWith({
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
    prisma.guild.findUnique.mockResolvedValue({ documentLimit: 1 });
    prisma.guildDocument.count.mockResolvedValue(1);

    await expect(
      service.createDocument("guild-1", "discord-1", { title: "Plan" }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.guildDocument.create).not.toHaveBeenCalled();
    expect(prisma.guildDocumentHistory.create).not.toHaveBeenCalled();
  });

  it("rejects too long titles before writing", async () => {
    await expect(
      service.createDocument("guild-1", "discord-1", {
        title: "x".repeat(121),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
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
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates an empty document and initial history snapshot", async () => {
    const document = createDocumentRecord();

    prisma.guild.findUnique.mockResolvedValue({ documentLimit: 50 });
    prisma.guildDocument.count.mockResolvedValue(0);
    prisma.guildDocument.create.mockResolvedValue(document);

    const result = await service.createDocument("guild-1", "discord-1", {
      title: " Plan ",
    });

    expect(prisma.guildDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guildId: "guild-1",
        title: "Plan",
        createdByMemberId: "discord-1",
        updatedByMemberId: "discord-1",
      }),
    });
    expect(prisma.guildDocumentHistory.create).toHaveBeenCalledWith({
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

    prisma.guildDocument.findFirst.mockResolvedValue(document);

    const result = await service.updateDocument(
      "guild-1",
      "doc-1",
      "discord-1",
      {
        title: " Plan ",
        content: baseContent,
      },
    );

    expect(prisma.guildDocument.update).not.toHaveBeenCalled();
    expect(prisma.guildDocumentHistory.create).not.toHaveBeenCalled();
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

    prisma.guildDocument.findFirst.mockResolvedValue(currentDocument);
    prisma.guildDocument.update.mockResolvedValue(updatedDocument);

    const result = await service.updateDocument(
      "guild-1",
      "doc-1",
      "discord-2",
      {
        title: "Plan v2",
        content: updatedContent,
      },
    );

    expect(prisma.guildDocument.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: expect.objectContaining({
        title: "Plan v2",
        updatedByMemberId: "discord-2",
        version: { increment: 1 },
      }),
    });
    expect(prisma.guildDocumentHistory.create).toHaveBeenCalledWith({
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
    prisma.guildDocument.findFirst.mockResolvedValue(createDocumentRecord());
    prisma.guildDocumentHistory.findFirst.mockResolvedValue(null);

    await expect(
      service.getHistorySnapshot("guild-1", "doc-1", "history-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns history metadata without content in list results", async () => {
    const history = createHistoryRecord();

    prisma.guildDocument.findFirst.mockResolvedValue(createDocumentRecord());
    prisma.guildDocumentHistory.findMany.mockResolvedValue([history]);

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

    prisma.guildDocument.findMany.mockResolvedValue([document]);
    prisma.member.findMany.mockResolvedValue([
      { userId: "discord-1", name: "Kamil" },
      { userId: "discord-2", name: "Wild" },
    ]);

    const result = await service.listTrash("guild-1");

    expect(prisma.guildDocument.findMany).toHaveBeenCalledWith(
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

    prisma.guildDocument.findFirst.mockResolvedValue(document);
    prisma.guildDocument.update.mockResolvedValue(deletedDocument);

    const result = await service.moveDocumentToTrash(
      "guild-1",
      "doc-1",
      "discord-2",
    );

    expect(prisma.guildDocument.findFirst).toHaveBeenCalledWith({
      where: { id: "doc-1", guildId: "guild-1", deletedAt: null },
    });
    expect(prisma.guildDocument.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        deletedByMemberId: "discord-2",
        updatedByMemberId: "discord-2",
      }),
    });
    expect(prisma.guildDocumentHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: "doc-1",
        guildId: "guild-1",
        version: 1,
        action: "DELETE",
        actorMemberId: "discord-2",
      }),
    });
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

    prisma.guildDocument.findFirst.mockResolvedValue(deletedDocument);
    prisma.guildDocument.update.mockResolvedValue(restoredDocument);

    const result = await service.restoreDocument(
      "guild-1",
      "doc-1",
      "discord-admin",
    );

    expect(prisma.guildDocument.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: {
        deletedAt: null,
        deletedByMemberId: null,
        updatedByMemberId: "discord-admin",
      },
    });
    expect(prisma.guildDocumentHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: "doc-1",
        guildId: "guild-1",
        version: 1,
        action: "RESTORE",
        actorMemberId: "discord-admin",
      }),
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects restore for active documents", async () => {
    prisma.guildDocument.findFirst.mockResolvedValue(createDocumentRecord());

    await expect(
      service.restoreDocument("guild-1", "doc-1", "discord-admin"),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.guildDocument.update).not.toHaveBeenCalled();
  });

  it("permanently deletes only trashed documents", async () => {
    prisma.guildDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      deletedAt: new Date("2026-06-22T11:00:00.000Z"),
    });

    const result = await service.purgeDocument("guild-1", "doc-1");

    expect(prisma.guildDocument.delete).toHaveBeenCalledWith({
      where: { id: "doc-1" },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects purge for active documents", async () => {
    prisma.guildDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      deletedAt: null,
    });

    await expect(
      service.purgeDocument("guild-1", "doc-1"),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.guildDocument.delete).not.toHaveBeenCalled();
  });
});
