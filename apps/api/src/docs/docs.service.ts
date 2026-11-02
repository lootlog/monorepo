import { createEmptyGuildDocumentContent } from "@lootlog/domain/guild-documents";

const EMPTY_DOCUMENT_CONTENT =
  createEmptyGuildDocumentContent() satisfies GuildDocumentContent;

import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { Effect, Schema } from "effect";
import {
  GUILD_DOCUMENT_CONTENT_MAX_LENGTH,
  GUILD_DOCUMENT_DEFAULT_LIMIT,
  GUILD_DOCUMENT_TITLE_MAX_LENGTH,
} from "./docs-limits.js";
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from "#src/contracts/docs/schemas";
import {
  GuildDocumentContentSchema,
  type GuildDocumentContent,
  type JsonValue,
} from "./guild-document-content.schema.js";
import type {
  StoredDocument,
  DocumentSummary,
  StoredDocumentHistory,
  DocumentHistorySummary,
  DocsRepositoryService,
} from "./docs.repository.js";

const normalizeTitle = (title: string) => {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    return Effect.fail(new InvalidRequestError("Document title is required"));
  }

  if (normalizedTitle.length > GUILD_DOCUMENT_TITLE_MAX_LENGTH) {
    return Effect.fail(new InvalidRequestError("Document title is too long"));
  }

  return Effect.succeed(normalizedTitle);
};

const normalizeContent = (content: JsonValue) => {
  let decodedContent: GuildDocumentContent;

  try {
    decodedContent = Schema.decodeUnknownSync(GuildDocumentContentSchema)(
      content,
    );
  } catch {
    return Effect.fail(new InvalidRequestError("Invalid document content"));
  }

  let stringifiedContent: string;

  try {
    stringifiedContent = JSON.stringify(decodedContent);
  } catch {
    return Effect.fail(
      new InvalidRequestError("Document content is not serializable"),
    );
  }

  return stringifiedContent.length > GUILD_DOCUMENT_CONTENT_MAX_LENGTH
    ? Effect.fail(new InvalidRequestError("Document content is too long"))
    : Effect.succeed(decodedContent);
};

const mapDocumentRecordWithEditors = (
  document: DocumentSummary,
  editorNames: ReadonlyMap<string, string>,
) => ({
  id: document.id,
  guildId: document.guildId,
  title: document.title,
  version: document.version,
  createdByMemberId: document.createdByDiscordId,
  createdBy: {
    memberId: document.createdByDiscordId,
    name: editorNames.get(document.createdByDiscordId) ?? null,
  },
  updatedByMemberId: document.updatedByDiscordId,
  updatedBy: {
    memberId: document.updatedByDiscordId,
    name: editorNames.get(document.updatedByDiscordId) ?? null,
  },
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

const mapHistoryRecordWithEditors = (
  history: DocumentHistorySummary,
  editorNames: ReadonlyMap<string, string>,
) => ({
  id: history.id,
  documentId: history.documentId,
  guildId: history.guildId,
  version: history.version,
  title: history.title,
  action: history.action,
  actorMemberId: history.actorDiscordId,
  actor: {
    memberId: history.actorDiscordId,
    name: editorNames.get(history.actorDiscordId) ?? null,
  },
  editedAt: history.editedAt,
});

export const makeDocsService = (repository: DocsRepositoryService) => {
  const mapDocumentRecords = (
    guildId: string,
    documents: ReadonlyArray<DocumentSummary>,
  ) =>
    repository
      .findEditorNames(
        guildId,
        documents.flatMap((document) => [
          document.createdByDiscordId,
          document.updatedByDiscordId,
        ]),
      )
      .pipe(
        Effect.map((editors) =>
          documents.map((document) =>
            mapDocumentRecordWithEditors(document, editors),
          ),
        ),
      );

  const mapDocumentRecord = (guildId: string, document: StoredDocument) =>
    mapDocumentRecords(guildId, [document]).pipe(
      Effect.map(([mappedDocument]) => ({
        ...mappedDocument,
        content: document.content,
      })),
    );

  const mapHistoryRecords = (
    guildId: string,
    history: ReadonlyArray<DocumentHistorySummary>,
  ) =>
    repository
      .findEditorNames(
        guildId,
        history.map((entry) => entry.actorDiscordId),
      )
      .pipe(
        Effect.map((editors) =>
          history.map((entry) => mapHistoryRecordWithEditors(entry, editors)),
        ),
      );

  const mapHistoryRecord = (guildId: string, history: StoredDocumentHistory) =>
    mapHistoryRecords(guildId, [history]).pipe(
      Effect.map(([mappedHistory]) => ({
        ...mappedHistory,
        content: history.content,
      })),
    );

  const findDocumentOrFail = (guildId: string, documentId: string) =>
    repository
      .findActive(guildId, documentId)
      .pipe(
        Effect.flatMap((document) =>
          document
            ? Effect.succeed(document)
            : Effect.fail(new ResourceNotFoundError("Document not found")),
        ),
      );

  return {
    listDocuments: (guildId: string) =>
      Effect.gen(function* () {
        const result = yield* repository.listDocuments(guildId);

        if (!result.guild) {
          return yield* Effect.fail(
            new ResourceNotFoundError("Guild not found"),
          );
        }

        const max = Math.max(
          0,
          result.guild.documentLimit ?? GUILD_DOCUMENT_DEFAULT_LIMIT,
        );

        return {
          items: yield* mapDocumentRecords(guildId, result.documents),
          limit: {
            used: result.used,
            max,
            trashed: result.trashed,
            canCreate: result.used < max,
          },
        };
      }),
    createDocument: (
      guildId: string,
      discordId: string,
      data: CreateDocumentRequest,
    ) =>
      Effect.gen(function* () {
        const title = yield* normalizeTitle(data.title);

        const document = yield* repository.createDocument({
          guildId,
          discordId,
          title,
          content: EMPTY_DOCUMENT_CONTENT,
          defaultLimit: GUILD_DOCUMENT_DEFAULT_LIMIT,
        });

        return yield* mapDocumentRecord(guildId, document);
      }),
    getDocument: (guildId: string, documentId: string) =>
      Effect.flatMap(findDocumentOrFail(guildId, documentId), (document) =>
        mapDocumentRecord(guildId, document),
      ),
    updateDocument: (
      guildId: string,
      documentId: string,
      discordId: string,
      data: UpdateDocumentRequest,
    ) =>
      Effect.gen(function* () {
        const title = yield* normalizeTitle(data.title);
        const content = yield* normalizeContent(data.content);

        const document = yield* repository.updateDocument({
          guildId,
          documentId,
          discordId,
          title,
          content,
          baseVersion: data.baseVersion,
        });

        return yield* mapDocumentRecord(guildId, document);
      }),
    listHistory: (guildId: string, documentId: string) =>
      Effect.gen(function* () {
        yield* findDocumentOrFail(guildId, documentId);
        const history = yield* repository.listHistory(guildId, documentId);

        return {
          items: yield* mapHistoryRecords(guildId, history),
        };
      }),
    getHistorySnapshot: (
      guildId: string,
      documentId: string,
      historyId: string,
    ) =>
      Effect.gen(function* () {
        yield* findDocumentOrFail(guildId, documentId);

        const history = yield* repository.findHistory(
          guildId,
          documentId,
          historyId,
        );

        if (!history) {
          return yield* Effect.fail(
            new ResourceNotFoundError("Document history not found"),
          );
        }

        return yield* mapHistoryRecord(guildId, history);
      }),
    listTrash: (guildId: string) =>
      Effect.gen(function* () {
        const documents = yield* repository.listTrash(guildId);

        const editors = yield* repository.findEditorNames(
          guildId,
          documents.flatMap((document) => [
            document.createdByDiscordId,
            document.updatedByDiscordId,
            document.deletedByDiscordId ?? document.updatedByDiscordId,
          ]),
        );

        return {
          items: documents.map((document) => {
            const deletedByMemberId =
              document.deletedByDiscordId ?? document.updatedByDiscordId;

            return {
              ...mapDocumentRecordWithEditors(document, editors),
              deletedAt: document.deletedAt ?? document.updatedAt,
              deletedByMemberId,
              deletedBy: {
                memberId: deletedByMemberId,
                name: editors.get(deletedByMemberId) ?? null,
              },
            };
          }),
        };
      }),
    moveDocumentToTrash: (
      guildId: string,
      documentId: string,
      discordId: string,
    ) =>
      repository
        .changeTrashState({
          guildId,
          documentId,
          discordId,
          action: "DELETE",
        })
        .pipe(Effect.as({ success: true })),
    restoreDocument: (guildId: string, documentId: string, discordId: string) =>
      repository
        .changeTrashState({
          guildId,
          documentId,
          discordId,
          action: "RESTORE",
        })
        .pipe(Effect.as({ success: true })),
    purgeDocument: (guildId: string, documentId: string) =>
      repository.purge(guildId, documentId).pipe(Effect.as({ success: true })),
  };
};

export type DocsService = ReturnType<typeof makeDocsService>;
