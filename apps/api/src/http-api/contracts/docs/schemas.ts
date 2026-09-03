/** Transport schemas owned by the docs HTTP module. */
import * as Schema from "effect/Schema";

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

export type GuildDocumentListResponseDto = {
  readonly items: ReadonlyArray<{
    readonly id: string;
    readonly guildId: string;
    readonly title: string;
    readonly version: number;
    readonly createdByMemberId: string;
    readonly createdBy: {
      readonly memberId: string;
      readonly name: string | null;
    };
    readonly updatedByMemberId: string;
    readonly updatedBy: {
      readonly memberId: string;
      readonly name: string | null;
    };
    readonly createdAt: string;
    readonly updatedAt: string;
  }>;
  readonly limit: {
    readonly canCreate: boolean;
    readonly max: number;
    readonly trashed: number;
    readonly used: number;
  };
};

export const GuildDocumentListResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      guildId: Schema.String,
      title: Schema.String,
      version: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      updatedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
    }),
  ),
  limit: Schema.Struct({
    canCreate: Schema.Boolean,
    max: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    trashed: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    used: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  }),
}).annotate({ identifier: "GuildDocumentListResponseDto" });

export type CreateGuildDocumentDto = { readonly title: string };

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

export type GuildDocumentResponseDto = {
  readonly id: string;
  readonly guildId: string;
  readonly title: string;
  readonly version: number;
  readonly createdByMemberId: string;
  readonly createdBy: {
    readonly memberId: string;
    readonly name: string | null;
  };
  readonly updatedByMemberId: string;
  readonly updatedBy: {
    readonly memberId: string;
    readonly name: string | null;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly content:
    | string
    | number
    | boolean
    | ReadonlyArray<GuildDocumentResponseDto__schema0>
    | { readonly [x: string]: GuildDocumentResponseDto__schema0 }
    | null;
};

export const GuildDocumentResponseDto = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  title: Schema.String,
  version: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
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
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  updatedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  content: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(GuildDocumentResponseDto__schema0),
      Schema.Record(Schema.String, GuildDocumentResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
}).annotate({ identifier: "GuildDocumentResponseDto" });

export type GuildDocumentTrashResponseDto = {
  readonly items: ReadonlyArray<{
    readonly id: string;
    readonly guildId: string;
    readonly title: string;
    readonly version: number;
    readonly createdByMemberId: string;
    readonly createdBy: {
      readonly memberId: string;
      readonly name: string | null;
    };
    readonly updatedByMemberId: string;
    readonly updatedBy: {
      readonly memberId: string;
      readonly name: string | null;
    };
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly deletedAt: string;
    readonly deletedByMemberId: string;
    readonly deletedBy: {
      readonly memberId: string;
      readonly name: string | null;
    };
  }>;
};

export const GuildDocumentTrashResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      guildId: Schema.String,
      title: Schema.String,
      version: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      updatedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      deletedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      deletedByMemberId: Schema.String,
      deletedBy: Schema.Struct({
        memberId: Schema.String,
        name: Schema.Union([Schema.String, Schema.Null]),
      }),
    }),
  ),
}).annotate({ identifier: "GuildDocumentTrashResponseDto" });

export type GuildDocumentHistoryResponseDto = {
  readonly items: ReadonlyArray<{
    readonly id: string;
    readonly documentId: string;
    readonly guildId: string;
    readonly version: number;
    readonly title: string;
    readonly action: "SAVE" | "DELETE" | "RESTORE";
    readonly actorMemberId: string;
    readonly actor: { readonly memberId: string; readonly name: string | null };
    readonly editedAt: string;
  }>;
};

export const GuildDocumentHistoryResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      documentId: Schema.String,
      guildId: Schema.String,
      version: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      title: Schema.String,
      action: Schema.Literals(["SAVE", "DELETE", "RESTORE"]),
      actorMemberId: Schema.String,
      actor: Schema.Struct({
        memberId: Schema.String,
        name: Schema.Union([Schema.String, Schema.Null]),
      }),
      editedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
    }),
  ),
}).annotate({ identifier: "GuildDocumentHistoryResponseDto" });

export type GuildDocumentHistorySnapshotResponseDto = {
  readonly id: string;
  readonly documentId: string;
  readonly guildId: string;
  readonly version: number;
  readonly title: string;
  readonly action: "SAVE" | "DELETE" | "RESTORE";
  readonly actorMemberId: string;
  readonly actor: { readonly memberId: string; readonly name: string | null };
  readonly editedAt: string;
  readonly content:
    | string
    | number
    | boolean
    | ReadonlyArray<GuildDocumentHistorySnapshotResponseDto__schema0>
    | { readonly [x: string]: GuildDocumentHistorySnapshotResponseDto__schema0 }
    | null;
};

export const GuildDocumentHistorySnapshotResponseDto = Schema.Struct({
  id: Schema.String,
  documentId: Schema.String,
  guildId: Schema.String,
  version: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  title: Schema.String,
  action: Schema.Literals(["SAVE", "DELETE", "RESTORE"]),
  actorMemberId: Schema.String,
  actor: Schema.Struct({
    memberId: Schema.String,
    name: Schema.Union([Schema.String, Schema.Null]),
  }),
  editedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  content: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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

export type UpdateGuildDocumentDto = {
  readonly content:
    | string
    | number
    | boolean
    | ReadonlyArray<UpdateGuildDocumentDto__schema0>
    | { readonly [x: string]: UpdateGuildDocumentDto__schema0 }
    | null;
  readonly title: string;
};

export const UpdateGuildDocumentDto = Schema.Struct({
  content: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
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

export type DocsMutationResponseDto = { readonly success: boolean };

export const DocsMutationResponseDto = Schema.Struct({
  success: Schema.Boolean,
}).annotate({ identifier: "DocsMutationResponseDto" });

const __recursive_GuildDocumentResponseDto__schema0 = Schema.Union([
  Schema.Union([
    Schema.String,
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(
        Schema.Union([
          Schema.Union([
            Schema.String,
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
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
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Boolean,
    Schema.Array(
      Schema.Union([
        Schema.Union([
          Schema.String,
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
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

export type DocsControllerGetDocumentsPathParams = { readonly guildId: string };

export const DocsControllerGetDocumentsPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type DocsControllerGetDocuments200 = GuildDocumentListResponseDto;

export const DocsControllerGetDocuments200 = GuildDocumentListResponseDto;

export type DocsControllerCreateDocumentPathParams = {
  readonly guildId: string;
};

export const DocsControllerCreateDocumentPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type DocsControllerCreateDocumentRequestJson = CreateGuildDocumentDto;

export const DocsControllerCreateDocumentRequestJson = CreateGuildDocumentDto;

export type DocsControllerCreateDocument201 = GuildDocumentResponseDto;

export const DocsControllerCreateDocument201 = GuildDocumentResponseDto;

export type DocsControllerGetTrashPathParams = { readonly guildId: string };

export const DocsControllerGetTrashPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type DocsControllerGetTrash200 = GuildDocumentTrashResponseDto;

export const DocsControllerGetTrash200 = GuildDocumentTrashResponseDto;

export type DocsControllerGetHistoryPathParams = {
  readonly docId: string;
  readonly guildId: string;
};

export const DocsControllerGetHistoryPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerGetHistory200 = GuildDocumentHistoryResponseDto;

export const DocsControllerGetHistory200 = GuildDocumentHistoryResponseDto;

export type DocsControllerGetHistorySnapshotPathParams = {
  readonly docId: string;
  readonly historyId: string;
  readonly guildId: string;
};

export const DocsControllerGetHistorySnapshotPathParams = Schema.Struct({
  docId: Schema.String,
  historyId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerGetHistorySnapshot200 =
  GuildDocumentHistorySnapshotResponseDto;

export const DocsControllerGetHistorySnapshot200 =
  GuildDocumentHistorySnapshotResponseDto;

export type DocsControllerGetDocumentPathParams = {
  readonly docId: string;
  readonly guildId: string;
};

export const DocsControllerGetDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerGetDocument200 = GuildDocumentResponseDto;

export const DocsControllerGetDocument200 = GuildDocumentResponseDto;

export type DocsControllerUpdateDocumentPathParams = {
  readonly docId: string;
  readonly guildId: string;
};

export const DocsControllerUpdateDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerUpdateDocumentRequestJson = UpdateGuildDocumentDto;

export const DocsControllerUpdateDocumentRequestJson = UpdateGuildDocumentDto;

export type DocsControllerUpdateDocument200 = GuildDocumentResponseDto;

export const DocsControllerUpdateDocument200 = GuildDocumentResponseDto;

export type DocsControllerDeleteDocumentPathParams = {
  readonly docId: string;
  readonly guildId: string;
};

export const DocsControllerDeleteDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerDeleteDocument200 = DocsMutationResponseDto;

export const DocsControllerDeleteDocument200 = DocsMutationResponseDto;

export type DocsControllerRestoreDocumentPathParams = {
  readonly docId: string;
  readonly guildId: string;
};

export const DocsControllerRestoreDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerRestoreDocument200 = DocsMutationResponseDto;

export const DocsControllerRestoreDocument200 = DocsMutationResponseDto;

export type DocsControllerPurgeDocumentPathParams = {
  readonly docId: string;
  readonly guildId: string;
};

export const DocsControllerPurgeDocumentPathParams = Schema.Struct({
  docId: Schema.String,
  guildId: Schema.String,
});

export type DocsControllerPurgeDocument200 = DocsMutationResponseDto;

export const DocsControllerPurgeDocument200 = DocsMutationResponseDto;
