/** Shared input and output schemas for the docs feature. */
import * as Schema from "effect/Schema";
import {
  NonEmptyString,
  DateTimeString,
  FiniteNumber,
  JsonValue,
} from "#src/contracts/scalars";

const DocumentContent = JsonValue.annotate({
  identifier: "GuildDocumentResponseDto__schema0",
});
const DocumentHistoryContent = JsonValue.annotate({
  identifier: "GuildDocumentHistorySnapshotResponseDto__schema0",
});
const UpdatedDocumentContent = JsonValue.annotate({
  identifier: "UpdateGuildDocumentDto__schema0",
});

const DocumentAuthor = Schema.Struct({
  memberId: Schema.String,
  name: Schema.Union([Schema.String, Schema.Null]),
});

const DocumentSummary = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  title: Schema.String,
  version: FiniteNumber,
  createdByMemberId: Schema.String,
  createdBy: DocumentAuthor,
  updatedByMemberId: Schema.String,
  updatedBy: DocumentAuthor,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
});

const DocumentHistoryEntry = Schema.Struct({
  id: Schema.String,
  documentId: Schema.String,
  guildId: Schema.String,
  version: FiniteNumber,
  title: Schema.String,
  action: Schema.Literals(["SAVE", "DELETE", "RESTORE"]),
  actorMemberId: Schema.String,
  actor: DocumentAuthor,
  editedAt: DateTimeString,
});

export type DocumentListResponse = typeof DocumentListResponse.Type;

export const DocumentListResponse = Schema.Struct({
  items: Schema.Array(DocumentSummary),
  limit: Schema.Struct({
    canCreate: Schema.Boolean,
    max: FiniteNumber,
    trashed: FiniteNumber,
    used: FiniteNumber,
  }),
}).annotate({ identifier: "GuildDocumentListResponseDto" });

export type CreateDocumentRequest = typeof CreateDocumentRequest.Type;

export const CreateDocumentRequest = Schema.Struct({
  title: NonEmptyString.check(
    Schema.isMaxLength(120).annotate({
      expected: "a value with a length of at most 120",
    }),
  ),
}).annotate({ identifier: "CreateGuildDocumentDto" });

export type DocumentResponse = typeof DocumentResponse.Type;

export const DocumentResponse = Schema.Struct({
  ...DocumentSummary.fields,
  content: DocumentContent,
}).annotate({ identifier: "GuildDocumentResponseDto" });

export type DocumentTrashResponse = typeof DocumentTrashResponse.Type;

export const DocumentTrashResponse = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      ...DocumentSummary.fields,
      deletedAt: DateTimeString,
      deletedByMemberId: Schema.String,
      deletedBy: DocumentAuthor,
    }),
  ),
}).annotate({ identifier: "GuildDocumentTrashResponseDto" });

export type DocumentHistoryResponse = typeof DocumentHistoryResponse.Type;

export const DocumentHistoryResponse = Schema.Struct({
  items: Schema.Array(DocumentHistoryEntry),
}).annotate({ identifier: "GuildDocumentHistoryResponseDto" });

export type DocumentHistorySnapshotResponse =
  typeof DocumentHistorySnapshotResponse.Type;

export const DocumentHistorySnapshotResponse = Schema.Struct({
  ...DocumentHistoryEntry.fields,
  content: DocumentHistoryContent,
}).annotate({ identifier: "GuildDocumentHistorySnapshotResponseDto" });

export type UpdateDocumentRequest = typeof UpdateDocumentRequest.Type;

export const UpdateDocumentRequest = Schema.Struct({
  content: UpdatedDocumentContent,
  title: NonEmptyString.check(
    Schema.isMaxLength(120).annotate({
      expected: "a value with a length of at most 120",
    }),
  ),
}).annotate({ identifier: "UpdateGuildDocumentDto" });

export type DocumentMutationResponse = typeof DocumentMutationResponse.Type;

export const DocumentMutationResponse = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "DocsMutationResponseDto" });

export type DocumentOrganizationPath = typeof DocumentOrganizationPath.Type;

export const DocumentOrganizationPath = Schema.Struct({
  guildId: Schema.String,
});

export type DocumentPath = typeof DocumentPath.Type;

export const DocumentPath = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocumentHistoryPath = typeof DocumentHistoryPath.Type;

export const DocumentHistoryPath = Schema.Struct({
  docId: Schema.String,
  historyId: Schema.String,
  guildId: Schema.String,
});
