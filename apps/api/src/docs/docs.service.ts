import {
  BadRequestException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import { Effect, Schema } from "effect";
import {
  GUILD_DOCUMENT_CONTENT_MAX_LENGTH,
  GUILD_DOCUMENT_DEFAULT_LIMIT,
  GUILD_DOCUMENT_TITLE_MAX_LENGTH,
} from "./constants/docs-limits.js";
import type {
  CreateGuildDocumentDto,
  UpdateGuildDocumentDto,
} from "#src/http-api/lootlog-api";
import {
  GuildDocumentContentSchema,
  type GuildDocumentContent,
  type JsonValue,
} from "./guild-document-content.schema.js";
import type {
  DocsRepositoryFailure,
  DocsRepositoryService,
} from "./docs.repository.js";

const EMPTY_DOCUMENT_CONTENT = {
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
} satisfies GuildDocumentContent;

type DocumentRecord = {
  id: string;
  guildId: string;
  title: string;
  content?: JsonValue;
  version: number;
  createdByMemberId: string;
  updatedByMemberId: string;
  deletedAt?: Date | null;
  deletedByMemberId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type HistoryRecord = {
  id: string;
  documentId: string;
  guildId: string;
  version: number;
  title: string;
  content?: JsonValue;
  action: "SAVE" | "DELETE" | "RESTORE";
  actorMemberId: string;
  editedAt: Date;
};

type DocsFailure =
  | DocsRepositoryFailure
  | BadRequestException
  | NotFoundException;
type DocsEffect = Effect.Effect<unknown, DocsFailure>;

export interface DocsService {
  readonly listDocuments: (guildId: string) => DocsEffect;
  readonly createDocument: (
    guildId: string,
    memberId: string,
    data: CreateGuildDocumentDto,
  ) => DocsEffect;
  readonly getDocument: (guildId: string, documentId: string) => DocsEffect;
  readonly updateDocument: (
    guildId: string,
    documentId: string,
    memberId: string,
    data: UpdateGuildDocumentDto,
  ) => DocsEffect;
  readonly listHistory: (guildId: string, documentId: string) => DocsEffect;
  readonly getHistorySnapshot: (
    guildId: string,
    documentId: string,
    historyId: string,
  ) => DocsEffect;
  readonly listTrash: (guildId: string) => DocsEffect;
  readonly moveDocumentToTrash: (
    guildId: string,
    documentId: string,
    memberId: string,
  ) => DocsEffect;
  readonly restoreDocument: (
    guildId: string,
    documentId: string,
    memberId: string,
  ) => DocsEffect;
  readonly purgeDocument: (guildId: string, documentId: string) => DocsEffect;
}

const normalizeTitle = (title: string) => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return Effect.fail(new BadRequestException("Document title is required"));
  }
  if (normalizedTitle.length > GUILD_DOCUMENT_TITLE_MAX_LENGTH) {
    return Effect.fail(new BadRequestException("Document title is too long"));
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
    return Effect.fail(new BadRequestException("Invalid document content"));
  }

  let stringifiedContent: string;
  try {
    stringifiedContent = JSON.stringify(decodedContent);
  } catch {
    return Effect.fail(
      new BadRequestException("Document content is not serializable"),
    );
  }
  return stringifiedContent.length > GUILD_DOCUMENT_CONTENT_MAX_LENGTH
    ? Effect.fail(new BadRequestException("Document content is too long"))
    : Effect.succeed(decodedContent);
};

const mapDocumentRecordWithEditors = (
  document: DocumentRecord,
  editorNameByMemberId: ReadonlyMap<string, string>,
) => ({
  id: document.id,
  guildId: document.guildId,
  title: document.title,
  version: document.version,
  createdByMemberId: document.createdByMemberId,
  createdBy: {
    memberId: document.createdByMemberId,
    name: editorNameByMemberId.get(document.createdByMemberId) ?? null,
  },
  updatedByMemberId: document.updatedByMemberId,
  updatedBy: {
    memberId: document.updatedByMemberId,
    name: editorNameByMemberId.get(document.updatedByMemberId) ?? null,
  },
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

const mapHistoryRecordWithEditors = (
  history: HistoryRecord,
  editorNameByMemberId: ReadonlyMap<string, string>,
) => ({
  id: history.id,
  documentId: history.documentId,
  guildId: history.guildId,
  version: history.version,
  title: history.title,
  action: history.action,
  actorMemberId: history.actorMemberId,
  actor: {
    memberId: history.actorMemberId,
    name: editorNameByMemberId.get(history.actorMemberId) ?? null,
  },
  editedAt: history.editedAt,
});

export const makeDocsService = (
  repository: DocsRepositoryService,
): DocsService => {
  const getEditorNameByMemberId = (guildId: string, memberIds: string[]) => {
    const uniqueMemberIds = [...new Set(memberIds)];
    return repository
      .findEditors(guildId, uniqueMemberIds)
      .pipe(
        Effect.map(
          (editors) =>
            new Map(editors.map((editor) => [editor.userId, editor.name])),
        ),
      );
  };

  const mapDocumentRecords = (guildId: string, documents: DocumentRecord[]) =>
    getEditorNameByMemberId(
      guildId,
      documents.flatMap((document) => [
        document.createdByMemberId,
        document.updatedByMemberId,
      ]),
    ).pipe(
      Effect.map((editors) =>
        documents.map((document) =>
          mapDocumentRecordWithEditors(document, editors),
        ),
      ),
    );

  const mapDocumentRecord = (guildId: string, document: DocumentRecord) =>
    mapDocumentRecords(guildId, [document]).pipe(
      Effect.map(([mappedDocument]) => ({
        ...mappedDocument,
        content: document.content,
      })),
    );

  const mapHistoryRecords = (guildId: string, history: HistoryRecord[]) =>
    getEditorNameByMemberId(
      guildId,
      history.map((entry) => entry.actorMemberId),
    ).pipe(
      Effect.map((editors) =>
        history.map((entry) => mapHistoryRecordWithEditors(entry, editors)),
      ),
    );

  const mapHistoryRecord = (guildId: string, history: HistoryRecord) =>
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
            ? Effect.succeed(document as DocumentRecord)
            : Effect.fail(new NotFoundException("Document not found")),
        ),
      );

  return {
    listDocuments: (guildId) =>
      Effect.gen(function* () {
        const result = (yield* repository.listDocuments(guildId)) as {
          guild: { documentLimit: number | null } | null;
          used: number;
          trashed: number;
          documents: DocumentRecord[];
        };
        if (!result.guild) {
          return yield* Effect.fail(new NotFoundException("Guild not found"));
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
    createDocument: (guildId, memberId, data) =>
      Effect.gen(function* () {
        const title = yield* normalizeTitle(data.title);
        const document = yield* repository.createDocument({
          guildId,
          memberId,
          title,
          content: EMPTY_DOCUMENT_CONTENT,
          defaultLimit: GUILD_DOCUMENT_DEFAULT_LIMIT,
        });
        return yield* mapDocumentRecord(guildId, document as DocumentRecord);
      }),
    getDocument: (guildId, documentId) =>
      Effect.flatMap(findDocumentOrFail(guildId, documentId), (document) =>
        mapDocumentRecord(guildId, document),
      ),
    updateDocument: (guildId, documentId, memberId, data) =>
      Effect.gen(function* () {
        const title = yield* normalizeTitle(data.title);
        const content = yield* normalizeContent(data.content);
        const document = yield* repository.updateDocument({
          guildId,
          documentId,
          memberId,
          title,
          content,
        });
        return yield* mapDocumentRecord(guildId, document as DocumentRecord);
      }),
    listHistory: (guildId, documentId) =>
      Effect.gen(function* () {
        yield* findDocumentOrFail(guildId, documentId);
        const history = yield* repository.listHistory(guildId, documentId);
        return {
          items: yield* mapHistoryRecords(guildId, history as HistoryRecord[]),
        };
      }),
    getHistorySnapshot: (guildId, documentId, historyId) =>
      Effect.gen(function* () {
        yield* findDocumentOrFail(guildId, documentId);
        const history = yield* repository.findHistory(
          guildId,
          documentId,
          historyId,
        );
        if (!history) {
          return yield* Effect.fail(
            new NotFoundException("Document history not found"),
          );
        }
        return yield* mapHistoryRecord(guildId, history as HistoryRecord);
      }),
    listTrash: (guildId) =>
      Effect.gen(function* () {
        const documents = (yield* repository.listTrash(
          guildId,
        )) as DocumentRecord[];
        const editors = yield* getEditorNameByMemberId(
          guildId,
          documents.flatMap((document) => [
            document.createdByMemberId,
            document.updatedByMemberId,
            document.deletedByMemberId ?? document.updatedByMemberId,
          ]),
        );
        return {
          items: documents.map((document) => {
            const deletedByMemberId =
              document.deletedByMemberId ?? document.updatedByMemberId;
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
    moveDocumentToTrash: (guildId, documentId, memberId) =>
      repository
        .changeTrashState({
          guildId,
          documentId,
          memberId,
          action: "DELETE",
        })
        .pipe(Effect.as({ success: true })),
    restoreDocument: (guildId, documentId, memberId) =>
      repository
        .changeTrashState({
          guildId,
          documentId,
          memberId,
          action: "RESTORE",
        })
        .pipe(Effect.as({ success: true })),
    purgeDocument: (guildId, documentId) =>
      repository.purge(guildId, documentId).pipe(Effect.as({ success: true })),
  };
};
