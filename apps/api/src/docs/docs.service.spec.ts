import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type { DocsRepositoryService } from "./docs.repository.js";
import { makeDocsService } from "./docs.service.js";

const content = { root: { children: [], type: "root", version: 1 } };
const document = {
  id: "doc-1",
  guildId: "guild-1",
  title: "Plan",
  content,
  version: 1,
  createdByMemberId: "discord-1",
  updatedByMemberId: "discord-1",
  createdAt: new Date("2026-06-22T10:00:00.000Z"),
  updatedAt: new Date("2026-06-22T10:00:00.000Z"),
};

const makeRepository = () => ({
  listDocuments: mock<DocsRepositoryService["listDocuments"]>(() =>
    Effect.succeed({
      guild: { documentLimit: 50 },
      used: 1,
      trashed: 0,
      documents: [document],
    }),
  ),
  createDocument: mock<DocsRepositoryService["createDocument"]>(() =>
    Effect.succeed(document),
  ),
  findActive: mock<DocsRepositoryService["findActive"]>(() =>
    Effect.succeed(document),
  ),
  updateDocument: mock<DocsRepositoryService["updateDocument"]>(() =>
    Effect.succeed(document),
  ),
  listHistory: mock<DocsRepositoryService["listHistory"]>(() =>
    Effect.succeed([]),
  ),
  findHistory: mock<DocsRepositoryService["findHistory"]>(() =>
    Effect.succeed(null),
  ),
  listTrash: mock<DocsRepositoryService["listTrash"]>(() => Effect.succeed([])),
  changeTrashState: mock<DocsRepositoryService["changeTrashState"]>(
    () => Effect.void,
  ),
  purge: mock<DocsRepositoryService["purge"]>(() => Effect.void),
  findEditors: mock<DocsRepositoryService["findEditors"]>(() =>
    Effect.succeed([{ userId: "discord-1", name: "Kamil" }]),
  ),
});

describe("docs service", () => {
  it("returns summaries with editor names and limits without document content", async () => {
    const service = makeDocsService(makeRepository());
    await expect(
      Effect.runPromise(service.listDocuments("guild-1")),
    ).resolves.toEqual({
      items: [
        {
          id: "doc-1",
          guildId: "guild-1",
          title: "Plan",
          version: 1,
          createdByMemberId: "discord-1",
          updatedByMemberId: "discord-1",
          createdBy: { memberId: "discord-1", name: "Kamil" },
          updatedBy: { memberId: "discord-1", name: "Kamil" },
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      ],
      limit: { used: 1, max: 50, trashed: 0, canCreate: true },
    });
  });

  it("normalizes the title and supplies an empty editor document", async () => {
    const repository = makeRepository();
    await Effect.runPromise(
      makeDocsService(repository).createDocument("guild-1", "discord-1", {
        title: " Plan ",
      }),
    );
    expect(repository.createDocument).toHaveBeenCalledWith({
      guildId: "guild-1",
      memberId: "discord-1",
      title: "Plan",
      defaultLimit: 50,
      content: {
        root: {
          children: [
            {
              children: [],
              direction: null,
              format: "",
              indent: 0,
              type: "paragraph",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      },
    });
  });

  it("rejects blank or oversized titles before persistence", async () => {
    const repository = makeRepository();
    const service = makeDocsService(repository);
    await Promise.all(
      [" ", "x".repeat(121)].map(async (title) => {
        await expect(
          Effect.runPromise(
            service.createDocument("guild-1", "discord-1", { title }),
          ),
        ).rejects.toBeInstanceOf(InvalidRequestError);
      }),
    );
    expect(repository.createDocument).not.toHaveBeenCalled();
  });

  it("rejects invalid or oversized content before persistence", async () => {
    const repository = makeRepository();
    const service = makeDocsService(repository);
    await Promise.all(
      [
        { root: "invalid" },
        { root: { children: [{ text: "x".repeat(250_001), type: "text" }] } },
      ].map(async (value) => {
        await expect(
          Effect.runPromise(
            service.updateDocument("guild-1", "doc-1", "discord-1", {
              title: "Plan",
              content: value,
            }),
          ),
        ).rejects.toBeInstanceOf(InvalidRequestError);
      }),
    );
    expect(repository.updateDocument).not.toHaveBeenCalled();
  });

  it("rejects missing document history and keeps list responses free of content", async () => {
    const repository = makeRepository();
    const history = {
      id: "history-1",
      documentId: "doc-1",
      guildId: "guild-1",
      version: 1,
      title: "Plan",
      content,
      action: "SAVE",
      actorMemberId: "discord-1",
      editedAt: document.updatedAt,
    };
    repository.listHistory.mockReturnValue(Effect.succeed([history]));
    const service = makeDocsService(repository);
    await expect(
      Effect.runPromise(
        service.getHistorySnapshot("guild-1", "doc-1", "missing"),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(
      Effect.runPromise(service.listHistory("guild-1", "doc-1")),
    ).resolves.toEqual({
      items: [
        {
          id: "history-1",
          documentId: "doc-1",
          guildId: "guild-1",
          version: 1,
          title: "Plan",
          action: "SAVE",
          actorMemberId: "discord-1",
          editedAt: document.updatedAt,
          actor: { memberId: "discord-1", name: "Kamil" },
        },
      ],
    });
    repository.findActive.mockReturnValue(Effect.succeed(null));
    repository.findHistory.mockClear();
    await expect(
      Effect.runPromise(
        service.getHistorySnapshot("guild-2", "doc-1", "history-1"),
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(repository.findHistory).not.toHaveBeenCalled();
  });

  it("resolves delete metadata for trashed documents", async () => {
    const repository = makeRepository();
    repository.listTrash.mockReturnValue(
      Effect.succeed([
        {
          ...document,
          deletedAt: document.updatedAt,
          deletedByMemberId: "discord-1",
        },
      ]),
    );
    await expect(
      Effect.runPromise(makeDocsService(repository).listTrash("guild-1")),
    ).resolves.toMatchObject({
      items: [
        {
          id: "doc-1",
          deletedAt: document.updatedAt,
          deletedByMemberId: "discord-1",
          deletedBy: { memberId: "discord-1", name: "Kamil" },
        },
      ],
    });
  });
});
