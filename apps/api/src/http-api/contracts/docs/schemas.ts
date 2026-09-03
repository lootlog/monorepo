/** Transport schemas owned by the docs HTTP module. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type GuildDocumentResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<GuildDocumentResponseDto__schema0>
      | { readonly [x: string]: GuildDocumentResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<GuildDocumentResponseDto__schema0>
        | { readonly [x: string]: GuildDocumentResponseDto__schema0 }
        | null;
    }
  | null;

export const GuildDocumentResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<GuildDocumentResponseDto__schema0> =>
    __recursive_GuildDocumentResponseDto__schema0,
);

export type GuildDocumentHistorySnapshotResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<GuildDocumentHistorySnapshotResponseDto__schema0>
      | {
          readonly [x: string]: GuildDocumentHistorySnapshotResponseDto__schema0;
        }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<GuildDocumentHistorySnapshotResponseDto__schema0>
        | {
            readonly [x: string]: GuildDocumentHistorySnapshotResponseDto__schema0;
          }
        | null;
    }
  | null;

export const GuildDocumentHistorySnapshotResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<GuildDocumentHistorySnapshotResponseDto__schema0> =>
    __recursive_GuildDocumentHistorySnapshotResponseDto__schema0,
);

export type UpdateGuildDocumentDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<UpdateGuildDocumentDto__schema0>
      | { readonly [x: string]: UpdateGuildDocumentDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<UpdateGuildDocumentDto__schema0>
        | { readonly [x: string]: UpdateGuildDocumentDto__schema0 }
        | null;
    }
  | null;

export const UpdateGuildDocumentDto__schema0 = Schema.suspend(
  (): Schema.Codec<UpdateGuildDocumentDto__schema0> =>
    __recursive_UpdateGuildDocumentDto__schema0,
);

export type GuildDocumentListResponseDto =
  typeof GuildDocumentListResponseDto.Type;

export const GuildDocumentListResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      guildId: Schema.String,
      title: Schema.String,
      version: FiniteNumber,
      createdByMemberId: Schema.String,
      createdBy: Schema.Struct({
        memberId: Schema.String,
        name: Schema.Union([Schema.String, Schema.Null]),
      }),
      updatedByMemberId: Schema.String,
      updatedBy: Schema.Struct({
        memberId: Schema.String,
        name: Schema.Union([Schema.String, Schema.Null]),
      }),
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
    }),
  ),
  limit: Schema.Struct({
    canCreate: Schema.Boolean,
    max: FiniteNumber,
    trashed: FiniteNumber,
    used: FiniteNumber,
  }),
}).annotate({ identifier: "GuildDocumentListResponseDto" });

export type CreateGuildDocumentDto = typeof CreateGuildDocumentDto.Type;

export const CreateGuildDocumentDto = Schema.Struct({
  title: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(120).annotate({
      expected: "a value with a length of at most 120",
    }),
  ),
}).annotate({ identifier: "CreateGuildDocumentDto" });

export type GuildDocumentResponseDto = typeof GuildDocumentResponseDto.Type;

export const GuildDocumentResponseDto = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  title: Schema.String,
  version: FiniteNumber,
  createdByMemberId: Schema.String,
  createdBy: Schema.Struct({
    memberId: Schema.String,
    name: Schema.Union([Schema.String, Schema.Null]),
  }),
  updatedByMemberId: Schema.String,
  updatedBy: Schema.Struct({
    memberId: Schema.String,
    name: Schema.Union([Schema.String, Schema.Null]),
  }),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  content: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(GuildDocumentResponseDto__schema0),
      Schema.Record(Schema.String, GuildDocumentResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
}).annotate({ identifier: "GuildDocumentResponseDto" });

export type GuildDocumentTrashResponseDto =
  typeof GuildDocumentTrashResponseDto.Type;

export const GuildDocumentTrashResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      guildId: Schema.String,
      title: Schema.String,
      version: FiniteNumber,
      createdByMemberId: Schema.String,
      createdBy: Schema.Struct({
        memberId: Schema.String,
        name: Schema.Union([Schema.String, Schema.Null]),
      }),
      updatedByMemberId: Schema.String,
      updatedBy: Schema.Struct({
        memberId: Schema.String,
        name: Schema.Union([Schema.String, Schema.Null]),
      }),
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
      deletedAt: DateTimeString,
      deletedByMemberId: Schema.String,
      deletedBy: Schema.Struct({
        memberId: Schema.String,
        name: Schema.Union([Schema.String, Schema.Null]),
      }),
    }),
  ),
}).annotate({ identifier: "GuildDocumentTrashResponseDto" });

export type GuildDocumentHistoryResponseDto =
  typeof GuildDocumentHistoryResponseDto.Type;

export const GuildDocumentHistoryResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      documentId: Schema.String,
      guildId: Schema.String,
      version: FiniteNumber,
      title: Schema.String,
      action: Schema.Literals(["SAVE", "DELETE", "RESTORE"]),
      actorMemberId: Schema.String,
      actor: Schema.Struct({
        memberId: Schema.String,
        name: Schema.Union([Schema.String, Schema.Null]),
      }),
      editedAt: DateTimeString,
    }),
  ),
}).annotate({ identifier: "GuildDocumentHistoryResponseDto" });

export type GuildDocumentHistorySnapshotResponseDto =
  typeof GuildDocumentHistorySnapshotResponseDto.Type;

export const GuildDocumentHistorySnapshotResponseDto = Schema.Struct({
  id: Schema.String,
  documentId: Schema.String,
  guildId: Schema.String,
  version: FiniteNumber,
  title: Schema.String,
  action: Schema.Literals(["SAVE", "DELETE", "RESTORE"]),
  actorMemberId: Schema.String,
  actor: Schema.Struct({
    memberId: Schema.String,
    name: Schema.Union([Schema.String, Schema.Null]),
  }),
  editedAt: DateTimeString,
  content: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(GuildDocumentHistorySnapshotResponseDto__schema0),
      Schema.Record(
        Schema.String,
        GuildDocumentHistorySnapshotResponseDto__schema0,
      ),
    ]),
    Schema.Null,
  ]),
}).annotate({ identifier: "GuildDocumentHistorySnapshotResponseDto" });

export type UpdateGuildDocumentDto = typeof UpdateGuildDocumentDto.Type;

export const UpdateGuildDocumentDto = Schema.Struct({
  content: Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(UpdateGuildDocumentDto__schema0),
      Schema.Record(Schema.String, UpdateGuildDocumentDto__schema0),
    ]),
    Schema.Null,
  ]),
  title: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(120).annotate({
      expected: "a value with a length of at most 120",
    }),
  ),
}).annotate({ identifier: "UpdateGuildDocumentDto" });

export type DocsMutationResponseDto = typeof DocsMutationResponseDto.Type;

export const DocsMutationResponseDto = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "DocsMutationResponseDto" });

const __recursive_GuildDocumentResponseDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    FiniteNumber,
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<GuildDocumentResponseDto__schema0> =>
                GuildDocumentResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<GuildDocumentResponseDto__schema0> =>
                GuildDocumentResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
    Schema.Record(
      Schema.String,
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<GuildDocumentResponseDto__schema0> =>
                GuildDocumentResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<GuildDocumentResponseDto__schema0> =>
                GuildDocumentResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "GuildDocumentResponseDto__schema0" });

const __recursive_GuildDocumentHistorySnapshotResponseDto__schema0 =
  Schema.Union([
    Schema.Union([
      Schema.String,
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(
        Schema.Union([
          Schema.Union([
            Schema.String,
            FiniteNumber,
            Schema.Boolean,
            Schema.Array(
              Schema.suspend(
                (): Schema.Codec<GuildDocumentHistorySnapshotResponseDto__schema0> =>
                  GuildDocumentHistorySnapshotResponseDto__schema0,
              ),
            ),
            Schema.Record(
              Schema.String,
              Schema.suspend(
                (): Schema.Codec<GuildDocumentHistorySnapshotResponseDto__schema0> =>
                  GuildDocumentHistorySnapshotResponseDto__schema0,
              ),
            ),
          ]),
          Schema.Null,
        ]),
      ),
      Schema.Record(
        Schema.String,
        Schema.Union([
          Schema.Union([
            Schema.String,
            FiniteNumber,
            Schema.Boolean,
            Schema.Array(
              Schema.suspend(
                (): Schema.Codec<GuildDocumentHistorySnapshotResponseDto__schema0> =>
                  GuildDocumentHistorySnapshotResponseDto__schema0,
              ),
            ),
            Schema.Record(
              Schema.String,
              Schema.suspend(
                (): Schema.Codec<GuildDocumentHistorySnapshotResponseDto__schema0> =>
                  GuildDocumentHistorySnapshotResponseDto__schema0,
              ),
            ),
          ]),
          Schema.Null,
        ]),
      ),
    ]),
    Schema.Null,
  ]).annotate({
    identifier: "GuildDocumentHistorySnapshotResponseDto__schema0",
  });

const __recursive_UpdateGuildDocumentDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    FiniteNumber,
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<UpdateGuildDocumentDto__schema0> =>
                UpdateGuildDocumentDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<UpdateGuildDocumentDto__schema0> =>
                UpdateGuildDocumentDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
    Schema.Record(
      Schema.String,
      Schema.Union([
        Schema.Union([
          Schema.String,
          FiniteNumber,
          Schema.Boolean,
          Schema.Array(
            Schema.suspend(
              (): Schema.Codec<UpdateGuildDocumentDto__schema0> =>
                UpdateGuildDocumentDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<UpdateGuildDocumentDto__schema0> =>
                UpdateGuildDocumentDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "UpdateGuildDocumentDto__schema0" });

export type DocsControllerGetDocumentsPathParams =
  typeof DocsControllerGetDocumentsPathParams.Type;

export const DocsControllerGetDocumentsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type DocsControllerGetDocuments200 =
  typeof DocsControllerGetDocuments200.Type;

export const DocsControllerGetDocuments200 = GuildDocumentListResponseDto;

export type DocsControllerCreateDocumentPathParams =
  typeof DocsControllerCreateDocumentPathParams.Type;

export const DocsControllerCreateDocumentPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type DocsControllerCreateDocumentRequestJson =
  typeof DocsControllerCreateDocumentRequestJson.Type;

export const DocsControllerCreateDocumentRequestJson = CreateGuildDocumentDto;

export type DocsControllerCreateDocument201 =
  typeof DocsControllerCreateDocument201.Type;

export const DocsControllerCreateDocument201 = GuildDocumentResponseDto;

export type DocsControllerGetTrashPathParams =
  typeof DocsControllerGetTrashPathParams.Type;

export const DocsControllerGetTrashPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type DocsControllerGetTrash200 = typeof DocsControllerGetTrash200.Type;

export const DocsControllerGetTrash200 = GuildDocumentTrashResponseDto;

export type DocsControllerGetHistoryPathParams =
  typeof DocsControllerGetHistoryPathParams.Type;

export const DocsControllerGetHistoryPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerGetHistory200 =
  typeof DocsControllerGetHistory200.Type;

export const DocsControllerGetHistory200 = GuildDocumentHistoryResponseDto;

export type DocsControllerGetHistorySnapshotPathParams =
  typeof DocsControllerGetHistorySnapshotPathParams.Type;

export const DocsControllerGetHistorySnapshotPathParams = Schema.Struct({
  docId: Schema.String,
  historyId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerGetHistorySnapshot200 =
  typeof DocsControllerGetHistorySnapshot200.Type;

export const DocsControllerGetHistorySnapshot200 =
  GuildDocumentHistorySnapshotResponseDto;

export type DocsControllerGetDocumentPathParams =
  typeof DocsControllerGetDocumentPathParams.Type;

export const DocsControllerGetDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerGetDocument200 =
  typeof DocsControllerGetDocument200.Type;

export const DocsControllerGetDocument200 = GuildDocumentResponseDto;

export type DocsControllerUpdateDocumentPathParams =
  typeof DocsControllerUpdateDocumentPathParams.Type;

export const DocsControllerUpdateDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerUpdateDocumentRequestJson =
  typeof DocsControllerUpdateDocumentRequestJson.Type;

export const DocsControllerUpdateDocumentRequestJson = UpdateGuildDocumentDto;

export type DocsControllerUpdateDocument200 =
  typeof DocsControllerUpdateDocument200.Type;

export const DocsControllerUpdateDocument200 = GuildDocumentResponseDto;

export type DocsControllerDeleteDocumentPathParams =
  typeof DocsControllerDeleteDocumentPathParams.Type;

export const DocsControllerDeleteDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerDeleteDocument200 =
  typeof DocsControllerDeleteDocument200.Type;

export const DocsControllerDeleteDocument200 = DocsMutationResponseDto;

export type DocsControllerRestoreDocumentPathParams =
  typeof DocsControllerRestoreDocumentPathParams.Type;

export const DocsControllerRestoreDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerRestoreDocument200 =
  typeof DocsControllerRestoreDocument200.Type;

export const DocsControllerRestoreDocument200 = DocsMutationResponseDto;

export type DocsControllerPurgeDocumentPathParams =
  typeof DocsControllerPurgeDocumentPathParams.Type;

export const DocsControllerPurgeDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerPurgeDocument200 =
  typeof DocsControllerPurgeDocument200.Type;

export const DocsControllerPurgeDocument200 = DocsMutationResponseDto;
