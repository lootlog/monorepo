import { Permission } from "src/db/domain";
import { PERMISSIONS_KEY } from "src/shared/permissions/permissions.decorator";
import { DocsController } from "./docs.controller";

describe("DocsController", () => {
  const mockDocsService = {
    listDocuments: vi.fn<(...args: unknown[]) => unknown>(),
    createDocument: vi.fn<(...args: unknown[]) => unknown>(),
    getDocument: vi.fn<(...args: unknown[]) => unknown>(),
    getTrash: vi.fn<(...args: unknown[]) => unknown>(),
    updateDocument: vi.fn<(...args: unknown[]) => unknown>(),
    listHistory: vi.fn<(...args: unknown[]) => unknown>(),
    getHistorySnapshot: vi.fn<(...args: unknown[]) => unknown>(),
    listTrash: vi.fn<(...args: unknown[]) => unknown>(),
    moveDocumentToTrash: vi.fn<(...args: unknown[]) => unknown>(),
    restoreDocument: vi.fn<(...args: unknown[]) => unknown>(),
    purgeDocument: vi.fn<(...args: unknown[]) => unknown>(),
  };

  let controller: DocsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new DocsController(mockDocsService as never);
  });

  it("declares read-or-write permissions for read endpoints", () => {
    const expected = [
      Permission.LOOTLOG_DOCS_READ,
      Permission.LOOTLOG_DOCS_WRITE,
    ];

    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        DocsController.prototype.getDocuments,
      ),
    ).toEqual(expected);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        DocsController.prototype.getDocument,
      ),
    ).toEqual(expected);
  });

  it("declares write permissions for mutations, trash and history", () => {
    const expected = [Permission.LOOTLOG_DOCS_WRITE];

    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        DocsController.prototype.createDocument,
      ),
    ).toEqual(expected);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        DocsController.prototype.updateDocument,
      ),
    ).toEqual(expected);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, DocsController.prototype.getHistory),
    ).toEqual(expected);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, DocsController.prototype.getTrash),
    ).toEqual(expected);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        DocsController.prototype.deleteDocument,
      ),
    ).toEqual(expected);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        DocsController.prototype.getHistorySnapshot,
      ),
    ).toEqual(expected);
  });

  it("declares admin permissions for restore and purge", () => {
    const expected = [Permission.OWNER, Permission.ADMIN];

    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        DocsController.prototype.restoreDocument,
      ),
    ).toEqual(expected);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        DocsController.prototype.purgeDocument,
      ),
    ).toEqual(expected);
  });

  it("delegates document operations with guild and member ids", () => {
    const guild = { id: "guild-1" } as never;
    const member = { userId: "discord-1" } as never;
    const createData = { title: "Plan" };
    const updateData = { title: "Plan v2", content: { root: {} } };

    controller.getDocuments(guild);
    controller.createDocument(guild, member, createData);
    controller.getTrash(guild);
    controller.getDocument(guild, "doc-1");
    controller.updateDocument(guild, "doc-1", member, updateData as never);
    controller.deleteDocument(guild, member, "doc-1");
    controller.restoreDocument(guild, member, "doc-1");
    controller.purgeDocument(guild, "doc-1");
    controller.getHistory(guild, "doc-1");
    controller.getHistorySnapshot(guild, "doc-1", "history-1");

    expect(mockDocsService.listDocuments).toHaveBeenCalledWith("guild-1");
    expect(mockDocsService.createDocument).toHaveBeenCalledWith(
      "guild-1",
      "discord-1",
      createData,
    );
    expect(mockDocsService.listTrash).toHaveBeenCalledWith("guild-1");
    expect(mockDocsService.getDocument).toHaveBeenCalledWith(
      "guild-1",
      "doc-1",
    );
    expect(mockDocsService.updateDocument).toHaveBeenCalledWith(
      "guild-1",
      "doc-1",
      "discord-1",
      updateData,
    );
    expect(mockDocsService.moveDocumentToTrash).toHaveBeenCalledWith(
      "guild-1",
      "doc-1",
      "discord-1",
    );
    expect(mockDocsService.restoreDocument).toHaveBeenCalledWith(
      "guild-1",
      "doc-1",
      "discord-1",
    );
    expect(mockDocsService.purgeDocument).toHaveBeenCalledWith(
      "guild-1",
      "doc-1",
    );
    expect(mockDocsService.listHistory).toHaveBeenCalledWith(
      "guild-1",
      "doc-1",
    );
    expect(mockDocsService.getHistorySnapshot).toHaveBeenCalledWith(
      "guild-1",
      "doc-1",
      "history-1",
    );
  });
});
