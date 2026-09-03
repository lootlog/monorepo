/** Transport schemas owned by the notifications HTTP module. */
import * as Schema from "effect/Schema";
import { Error as NotificationError } from "../../../notifications/enum/error.enum.js";
import { SuccessResponseDto_Output } from "../shared.js";

export type NotificationTargetResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<NotificationTargetResponseDto__schema0>
      | { readonly [x: string]: NotificationTargetResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<NotificationTargetResponseDto__schema0>
        | { readonly [x: string]: NotificationTargetResponseDto__schema0 }
        | null;
    }
  | null;

export const NotificationTargetResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<NotificationTargetResponseDto__schema0> =>
    __recursive_NotificationTargetResponseDto__schema0,
);

export type GuildNotificationRulesResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<GuildNotificationRulesResponseDto__schema0>
      | { readonly [x: string]: GuildNotificationRulesResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<GuildNotificationRulesResponseDto__schema0>
        | { readonly [x: string]: GuildNotificationRulesResponseDto__schema0 }
        | null;
    }
  | null;

export const GuildNotificationRulesResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<GuildNotificationRulesResponseDto__schema0> =>
    __recursive_GuildNotificationRulesResponseDto__schema0,
);

export type NotificationRuleResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<NotificationRuleResponseDto__schema0>
      | { readonly [x: string]: NotificationRuleResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<NotificationRuleResponseDto__schema0>
        | { readonly [x: string]: NotificationRuleResponseDto__schema0 }
        | null;
    }
  | null;

export const NotificationRuleResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<NotificationRuleResponseDto__schema0> =>
    __recursive_NotificationRuleResponseDto__schema0,
);

export type NotificationJobsResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<NotificationJobsResponseDto__schema0>
      | { readonly [x: string]: NotificationJobsResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<NotificationJobsResponseDto__schema0>
        | { readonly [x: string]: NotificationJobsResponseDto__schema0 }
        | null;
    }
  | null;

export const NotificationJobsResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<NotificationJobsResponseDto__schema0> =>
    __recursive_NotificationJobsResponseDto__schema0,
);

export type NotificationTargetWithTestTriggerResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<NotificationTargetWithTestTriggerResponseDto__schema0>
      | {
          readonly [x: string]: NotificationTargetWithTestTriggerResponseDto__schema0;
        }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<NotificationTargetWithTestTriggerResponseDto__schema0>
        | {
            readonly [x: string]: NotificationTargetWithTestTriggerResponseDto__schema0;
          }
        | null;
    }
  | null;

export const NotificationTargetWithTestTriggerResponseDto__schema0 =
  Schema.suspend(
    (): Schema.Codec<NotificationTargetWithTestTriggerResponseDto__schema0> =>
      __recursive_NotificationTargetWithTestTriggerResponseDto__schema0,
  );

export type WatchedItemResponseDto__schema0 =
  | string
  | number
  | boolean
  | ReadonlyArray<
      | string
      | number
      | boolean
      | ReadonlyArray<WatchedItemResponseDto__schema0>
      | { readonly [x: string]: WatchedItemResponseDto__schema0 }
      | null
    >
  | {
      readonly [x: string]:
        | string
        | number
        | boolean
        | ReadonlyArray<WatchedItemResponseDto__schema0>
        | { readonly [x: string]: WatchedItemResponseDto__schema0 }
        | null;
    }
  | null;

export const WatchedItemResponseDto__schema0 = Schema.suspend(
  (): Schema.Codec<WatchedItemResponseDto__schema0> =>
    __recursive_WatchedItemResponseDto__schema0,
);

export type NotificationTargetResponseDto = {
  readonly id: number;
  readonly ownerType: "GUILD" | "USER";
  readonly ownerId: string;
  readonly provider: "DISCORD";
  readonly targetType: "CHANNEL" | "DM";
  readonly externalId: string;
  readonly displayName: string | null;
  readonly guildName: string | null;
  readonly metadata:
    | string
    | number
    | boolean
    | ReadonlyArray<NotificationTargetResponseDto__schema0>
    | { readonly [x: string]: NotificationTargetResponseDto__schema0 }
    | null;
  readonly active: boolean;
  readonly canSend: boolean;
  readonly lastSyncedAt: string | null;
  readonly lastDeliveryAt: string | null;
  readonly lastDeliveryError: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const NotificationTargetResponseDto = Schema.Struct({
  id: Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  ownerType: Schema.Literals(["GUILD", "USER"]),
  ownerId: Schema.String,
  provider: Schema.Literal("DISCORD"),
  targetType: Schema.Literals(["CHANNEL", "DM"]),
  externalId: Schema.String,
  displayName: Schema.Union([Schema.String, Schema.Null]),
  guildName: Schema.Union([Schema.String, Schema.Null]),
  metadata: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(NotificationTargetResponseDto__schema0),
      Schema.Record(Schema.String, NotificationTargetResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  active: Schema.Boolean,
  canSend: Schema.Boolean,
  lastSyncedAt: Schema.Union([
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    Schema.Null,
  ]),
  lastDeliveryAt: Schema.Union([
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    Schema.Null,
  ]),
  lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
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
}).annotate({ identifier: "NotificationTargetResponseDto" });

export type CreateNotificationTargetDto = {
  readonly targetType: "CHANNEL" | "DM";
  readonly externalId?: string;
  readonly displayName?: string;
};

export const CreateNotificationTargetDto = Schema.Struct({
  targetType: Schema.Literals(["CHANNEL", "DM"]),
  externalId: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
  ),
  displayName: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
  ),
}).annotate({ identifier: "CreateNotificationTargetDto" });

export type GuildAvailableNotificationTargetsResponseDto = {
  readonly channels: ReadonlyArray<{
    readonly id: number;
    readonly guildId: string;
    readonly channelId: string;
    readonly name: string;
    readonly channelType: string;
    readonly parentId: string | null;
    readonly position: number;
    readonly active: boolean;
    readonly canView: boolean;
    readonly canSend: boolean;
    readonly hasRequiredPermissions: boolean;
    readonly requiredPermissions: ReadonlyArray<string>;
    readonly grantedPermissions: ReadonlyArray<string>;
    readonly missingPermissions: ReadonlyArray<string>;
    readonly lastSyncedAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  }>;
  readonly syncState:
    | ({
        readonly guildId: string;
        readonly status:
          | "SYNCED"
          | "SYNCING"
          | "FAILED"
          | "STALE"
          | "NOT_FOUND";
        readonly hasRequiredPermissions: boolean;
        readonly requiredPermissions: ReadonlyArray<string>;
        readonly grantedPermissions: ReadonlyArray<string>;
        readonly missingPermissions: ReadonlyArray<string>;
        readonly channelCount: number;
        readonly selectableChannelCount: number;
        readonly lastAttemptAt: string | null;
        readonly lastSuccessAt: string | null;
        readonly lastError: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
      } & { readonly [x: string]: Schema.Json })
    | null;
};

export const GuildAvailableNotificationTargetsResponseDto = Schema.Struct({
  channels: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      guildId: Schema.String,
      channelId: Schema.String,
      name: Schema.String,
      channelType: Schema.String,
      parentId: Schema.Union([Schema.String, Schema.Null]),
      position: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      active: Schema.Boolean,
      canView: Schema.Boolean,
      canSend: Schema.Boolean,
      hasRequiredPermissions: Schema.Boolean,
      requiredPermissions: Schema.Array(Schema.String),
      grantedPermissions: Schema.Array(Schema.String),
      missingPermissions: Schema.Array(Schema.String),
      lastSyncedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
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
  syncState: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        guildId: Schema.String,
        status: Schema.Literals([
          "SYNCED",
          "SYNCING",
          "FAILED",
          "STALE",
          "NOT_FOUND",
        ]),
        hasRequiredPermissions: Schema.Boolean,
        requiredPermissions: Schema.Array(Schema.String),
        grantedPermissions: Schema.Array(Schema.String),
        missingPermissions: Schema.Array(Schema.String),
        channelCount: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        selectableChannelCount: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        lastAttemptAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        lastSuccessAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        lastError: Schema.Union([Schema.String, Schema.Null]),
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
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "GuildAvailableNotificationTargetsResponseDto" });

export type UpdateNotificationTargetDto = {
  readonly displayName?: string | null;
  readonly active?: boolean;
};

export const UpdateNotificationTargetDto = Schema.Struct({
  displayName: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.isMaxLength(255).annotate({
          expected: "a value with a length of at most 255",
        }),
      ),
      Schema.Null,
    ]),
  ),
  active: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "UpdateNotificationTargetDto" });

export type GuildNotificationRulesResponseDto = {
  readonly items: ReadonlyArray<{
    readonly id: number;
    readonly ownerType: "GUILD" | "USER";
    readonly ownerId: string;
    readonly triggerType:
      | "TIMER_BEFORE_SPAWN"
      | "NPC_SPAWNED"
      | "WATCHED_ITEM_DROPPED"
      | "SCHEDULED_MESSAGE";
    readonly guildId: string | null;
    readonly world: string | null;
    readonly name: string | null;
    readonly filters:
      | ({
          readonly guildIds?: ReadonlyArray<string>;
          readonly world?: string;
          readonly npcId?: number | null;
          readonly npcIds?: ReadonlyArray<number>;
          readonly itemId?: number | null;
          readonly itemIds?: ReadonlyArray<number>;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly contentTemplate: string | null;
    readonly scheduleStrategy:
      | "SPAWN_WINDOW_RELATIVE"
      | "FIXED_DATETIME"
      | null;
    readonly scheduleAnchor: "MIN_SPAWN" | "MAX_SPAWN" | null;
    readonly scheduleOffsetMinutes: number | null;
    readonly scheduledAt: string | null;
    readonly scheduleIntervalType:
      | "ONCE"
      | "HOURLY"
      | "DAILY"
      | "WEEKLY"
      | null;
    readonly scheduleIntervalValue: number | null;
    readonly scheduleWeekday: number | null;
    readonly scheduleTimeOfDay: string | null;
    readonly scheduledUntil: string | null;
    readonly scheduleTimezone: string | null;
    readonly enabled: boolean;
    readonly dedupeWindowSeconds: number;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly targets: ReadonlyArray<{
      readonly ruleId: number;
      readonly targetId: number;
      readonly createdAt: string;
      readonly target: {
        readonly id: number;
        readonly ownerType: "GUILD" | "USER";
        readonly ownerId: string;
        readonly provider: "DISCORD";
        readonly targetType: "CHANNEL" | "DM";
        readonly externalId: string;
        readonly displayName: string | null;
        readonly guildName: string | null;
        readonly metadata:
          | string
          | number
          | boolean
          | ReadonlyArray<GuildNotificationRulesResponseDto__schema0>
          | { readonly [x: string]: GuildNotificationRulesResponseDto__schema0 }
          | null;
        readonly active: boolean;
        readonly canSend: boolean;
        readonly lastSyncedAt: string | null;
        readonly lastDeliveryAt: string | null;
        readonly lastDeliveryError: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
      };
    }>;
    readonly testTrigger: {
      readonly limit: number;
      readonly used: number;
      readonly remaining: number;
      readonly windowSeconds: number;
      readonly nextAvailableAt: string | null;
    };
  }>;
  readonly limits: {
    readonly ruleLimit: number;
    readonly ruleCount: number;
    readonly maxNpcsPerRule: number;
    readonly testTriggerLimit: number;
    readonly testTriggerWindowSeconds: number;
  };
};

export const GuildNotificationRulesResponseDto = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      ownerType: Schema.Literals(["GUILD", "USER"]),
      ownerId: Schema.String,
      triggerType: Schema.Literals([
        "TIMER_BEFORE_SPAWN",
        "NPC_SPAWNED",
        "WATCHED_ITEM_DROPPED",
        "SCHEDULED_MESSAGE",
      ]),
      guildId: Schema.Union([Schema.String, Schema.Null]),
      world: Schema.Union([Schema.String, Schema.Null]),
      name: Schema.Union([Schema.String, Schema.Null]),
      filters: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
            world: Schema.optionalKey(Schema.String),
            npcId: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
                Schema.Null,
              ]),
            ),
            npcIds: Schema.optionalKey(
              Schema.Array(
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
              ),
            ),
            itemId: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
                Schema.Null,
              ]),
            ),
            itemIds: Schema.optionalKey(
              Schema.Array(
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
              ),
            ),
          }),
          [
            Schema.Record(
              Schema.String,
              Schema.Json.annotate({ expected: "JSON value" }),
            ),
          ],
        ),
        Schema.Null,
      ]),
      contentTemplate: Schema.Union([Schema.String, Schema.Null]),
      scheduleStrategy: Schema.Union([
        Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
        Schema.Null,
      ]),
      scheduleAnchor: Schema.Union([
        Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
        Schema.Null,
      ]),
      scheduleOffsetMinutes: Schema.Union([
        Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        Schema.Null,
      ]),
      scheduledAt: Schema.Union([
        Schema.String.annotate({ format: "date-time" }).check(
          Schema.isPattern(
            new RegExp(
              "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            ),
          ).annotate({
            expected:
              "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          }),
        ),
        Schema.Null,
      ]),
      scheduleIntervalType: Schema.Union([
        Schema.Literals(["ONCE", "HOURLY", "DAILY", "WEEKLY"]),
        Schema.Null,
      ]),
      scheduleIntervalValue: Schema.Union([
        Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        Schema.Null,
      ]),
      scheduleWeekday: Schema.Union([
        Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        Schema.Null,
      ]),
      scheduleTimeOfDay: Schema.Union([Schema.String, Schema.Null]),
      scheduledUntil: Schema.Union([
        Schema.String.annotate({ format: "date-time" }).check(
          Schema.isPattern(
            new RegExp(
              "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            ),
          ).annotate({
            expected:
              "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          }),
        ),
        Schema.Null,
      ]),
      scheduleTimezone: Schema.Union([Schema.String, Schema.Null]),
      enabled: Schema.Boolean,
      dedupeWindowSeconds: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
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
      targets: Schema.Array(
        Schema.Struct({
          ruleId: Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          targetId: Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
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
          target: Schema.Struct({
            id: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
            ownerType: Schema.Literals(["GUILD", "USER"]),
            ownerId: Schema.String,
            provider: Schema.Literal("DISCORD"),
            targetType: Schema.Literals(["CHANNEL", "DM"]),
            externalId: Schema.String,
            displayName: Schema.Union([Schema.String, Schema.Null]),
            guildName: Schema.Union([Schema.String, Schema.Null]),
            metadata: Schema.Union([
              Schema.Union([
                Schema.String,
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
                Schema.Boolean,
                Schema.Array(GuildNotificationRulesResponseDto__schema0),
                Schema.Record(
                  Schema.String,
                  GuildNotificationRulesResponseDto__schema0,
                ),
              ]),
              Schema.Null,
            ]),
            active: Schema.Boolean,
            canSend: Schema.Boolean,
            lastSyncedAt: Schema.Union([
              Schema.String.annotate({ format: "date-time" }).check(
                Schema.isPattern(
                  new RegExp(
                    "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                  ),
                ).annotate({
                  expected:
                    "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                }),
              ),
              Schema.Null,
            ]),
            lastDeliveryAt: Schema.Union([
              Schema.String.annotate({ format: "date-time" }).check(
                Schema.isPattern(
                  new RegExp(
                    "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                  ),
                ).annotate({
                  expected:
                    "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                }),
              ),
              Schema.Null,
            ]),
            lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
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
        }),
      ),
      testTrigger: Schema.Struct({
        limit: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        used: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        remaining: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        windowSeconds: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        nextAvailableAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
            }),
          ),
          Schema.Null,
        ]),
      }),
    }),
  ),
  limits: Schema.Struct({
    ruleLimit: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    ruleCount: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    maxNpcsPerRule: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    testTriggerLimit: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    testTriggerWindowSeconds: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  }),
}).annotate({ identifier: "GuildNotificationRulesResponseDto" });

export type CreateNotificationRuleDto = {
  readonly name?: string | null;
  readonly contentTemplate?: string | null;
  readonly triggerType:
    | "TIMER_BEFORE_SPAWN"
    | "NPC_SPAWNED"
    | "WATCHED_ITEM_DROPPED"
    | "SCHEDULED_MESSAGE";
  readonly world?: string;
  readonly npcId?: number;
  readonly npcIds?: ReadonlyArray<number>;
  readonly itemId?: number;
  readonly itemIds?: ReadonlyArray<number>;
  readonly scheduleStrategy?: "SPAWN_WINDOW_RELATIVE" | "FIXED_DATETIME";
  readonly scheduleAnchor?: "MIN_SPAWN" | "MAX_SPAWN";
  readonly scheduleOffsetMinutes?: number;
  readonly scheduledAt?: string;
  readonly scheduleIntervalType?: "ONCE" | "HOURLY" | "DAILY" | "WEEKLY";
  readonly scheduleIntervalValue?: number;
  readonly scheduleWeekday?: number;
  readonly scheduleTimeOfDay?: string;
  readonly scheduledUntil?: string;
  readonly scheduleTimezone?: string;
  readonly targetIds: ReadonlyArray<number>;
  readonly enabled?: boolean;
};

export const CreateNotificationRuleDto = Schema.Struct({
  name: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.isMaxLength(255).annotate({
          expected: "a value with a length of at most 255",
        }),
      ),
      Schema.Null,
    ]),
  ),
  contentTemplate: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.isMaxLength(4000).annotate({
          expected: "a value with a length of at most 4000",
        }),
      ),
      Schema.Null,
    ]),
  ),
  triggerType: Schema.Literals([
    "TIMER_BEFORE_SPAWN",
    "NPC_SPAWNED",
    "WATCHED_ITEM_DROPPED",
    "SCHEDULED_MESSAGE",
  ]),
  world: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  npcId: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  npcIds: Schema.optionalKey(
    Schema.Array(
      Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
    ).check(
      Schema.isMaxLength(5).annotate({
        expected: "a value with a length of at most 5",
      }),
    ),
  ),
  itemId: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  itemIds: Schema.optionalKey(
    Schema.Array(
      Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
    ).check(
      Schema.isMaxLength(20).annotate({
        expected: "a value with a length of at most 20",
      }),
    ),
  ),
  scheduleStrategy: Schema.optionalKey(
    Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
  ),
  scheduleAnchor: Schema.optionalKey(
    Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
  ),
  scheduleOffsetMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1440).annotate({
          expected: "a value less than or equal to 1440",
        }),
      ),
  ),
  scheduledAt: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  scheduleIntervalType: Schema.optionalKey(
    Schema.Literals(["ONCE", "HOURLY", "DAILY", "WEEKLY"]),
  ),
  scheduleIntervalValue: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(24).annotate({
          expected: "a value less than or equal to 24",
        }),
      ),
  ),
  scheduleWeekday: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(6).annotate({
          expected: "a value less than or equal to 6",
        }),
      ),
  ),
  scheduleTimeOfDay: Schema.optionalKey(
    Schema.String.check(
      Schema.isPattern(new RegExp("^\\d{2}:\\d{2}$")).annotate({
        expected: "a string matching the RegExp ^\\d{2}:\\d{2}$",
      }),
    ),
  ),
  scheduledUntil: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  scheduleTimezone: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  targetIds: Schema.Array(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ).check(
    Schema.isMaxLength(3).annotate({
      expected: "a value with a length of at most 3",
    }),
  ),
  enabled: Schema.optionalKey(Schema.Boolean),
})
  .check(
    Schema.makeFilter((data) =>
      data.triggerType === "SCHEDULED_MESSAGE" ||
      (data.world !== undefined && data.world.length > 0)
        ? undefined
        : {
            path: ["world"],
            issue: NotificationError.NOTIFICATION_RULE_WORLD_REQUIRED,
          },
    ),
  )
  .check(
    Schema.makeFilter((data) => {
      if (data.npcId === undefined && data.npcIds === undefined)
        return undefined;
      return typeof data.npcId === "number" ||
        (data.npcIds !== undefined && data.npcIds.length > 0)
        ? undefined
        : {
            path: ["npcId"],
            issue:
              NotificationError.NOTIFICATION_RULE_MUST_TARGET_AT_LEAST_ONE_NPC,
          };
    }),
  )
  .annotate({ identifier: "CreateNotificationRuleDto" });

export type NotificationRuleResponseDto = {
  readonly id: number;
  readonly ownerType: "GUILD" | "USER";
  readonly ownerId: string;
  readonly triggerType:
    | "TIMER_BEFORE_SPAWN"
    | "NPC_SPAWNED"
    | "WATCHED_ITEM_DROPPED"
    | "SCHEDULED_MESSAGE";
  readonly guildId: string | null;
  readonly world: string | null;
  readonly name: string | null;
  readonly filters:
    | ({
        readonly guildIds?: ReadonlyArray<string>;
        readonly world?: string;
        readonly npcId?: number | null;
        readonly npcIds?: ReadonlyArray<number>;
        readonly itemId?: number | null;
        readonly itemIds?: ReadonlyArray<number>;
      } & { readonly [x: string]: Schema.Json })
    | null;
  readonly contentTemplate: string | null;
  readonly scheduleStrategy: "SPAWN_WINDOW_RELATIVE" | "FIXED_DATETIME" | null;
  readonly scheduleAnchor: "MIN_SPAWN" | "MAX_SPAWN" | null;
  readonly scheduleOffsetMinutes: number | null;
  readonly scheduledAt: string | null;
  readonly scheduleIntervalType: "ONCE" | "HOURLY" | "DAILY" | "WEEKLY" | null;
  readonly scheduleIntervalValue: number | null;
  readonly scheduleWeekday: number | null;
  readonly scheduleTimeOfDay: string | null;
  readonly scheduledUntil: string | null;
  readonly scheduleTimezone: string | null;
  readonly enabled: boolean;
  readonly dedupeWindowSeconds: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly targets: ReadonlyArray<{
    readonly ruleId: number;
    readonly targetId: number;
    readonly createdAt: string;
    readonly target: {
      readonly id: number;
      readonly ownerType: "GUILD" | "USER";
      readonly ownerId: string;
      readonly provider: "DISCORD";
      readonly targetType: "CHANNEL" | "DM";
      readonly externalId: string;
      readonly displayName: string | null;
      readonly guildName: string | null;
      readonly metadata:
        | string
        | number
        | boolean
        | ReadonlyArray<NotificationRuleResponseDto__schema0>
        | { readonly [x: string]: NotificationRuleResponseDto__schema0 }
        | null;
      readonly active: boolean;
      readonly canSend: boolean;
      readonly lastSyncedAt: string | null;
      readonly lastDeliveryAt: string | null;
      readonly lastDeliveryError: string | null;
      readonly createdAt: string;
      readonly updatedAt: string;
    };
  }>;
};

export const NotificationRuleResponseDto = Schema.Struct({
  id: Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  ownerType: Schema.Literals(["GUILD", "USER"]),
  ownerId: Schema.String,
  triggerType: Schema.Literals([
    "TIMER_BEFORE_SPAWN",
    "NPC_SPAWNED",
    "WATCHED_ITEM_DROPPED",
    "SCHEDULED_MESSAGE",
  ]),
  guildId: Schema.Union([Schema.String, Schema.Null]),
  world: Schema.Union([Schema.String, Schema.Null]),
  name: Schema.Union([Schema.String, Schema.Null]),
  filters: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
        world: Schema.optionalKey(Schema.String),
        npcId: Schema.optionalKey(
          Schema.Union([
            Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
            Schema.Null,
          ]),
        ),
        npcIds: Schema.optionalKey(
          Schema.Array(
            Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
          ),
        ),
        itemId: Schema.optionalKey(
          Schema.Union([
            Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
            Schema.Null,
          ]),
        ),
        itemIds: Schema.optionalKey(
          Schema.Array(
            Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
          ),
        ),
      }),
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
  contentTemplate: Schema.Union([Schema.String, Schema.Null]),
  scheduleStrategy: Schema.Union([
    Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
    Schema.Null,
  ]),
  scheduleAnchor: Schema.Union([
    Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
    Schema.Null,
  ]),
  scheduleOffsetMinutes: Schema.Union([
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    Schema.Null,
  ]),
  scheduledAt: Schema.Union([
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    Schema.Null,
  ]),
  scheduleIntervalType: Schema.Union([
    Schema.Literals(["ONCE", "HOURLY", "DAILY", "WEEKLY"]),
    Schema.Null,
  ]),
  scheduleIntervalValue: Schema.Union([
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    Schema.Null,
  ]),
  scheduleWeekday: Schema.Union([
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    Schema.Null,
  ]),
  scheduleTimeOfDay: Schema.Union([Schema.String, Schema.Null]),
  scheduledUntil: Schema.Union([
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    Schema.Null,
  ]),
  scheduleTimezone: Schema.Union([Schema.String, Schema.Null]),
  enabled: Schema.Boolean,
  dedupeWindowSeconds: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
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
  targets: Schema.Array(
    Schema.Struct({
      ruleId: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      targetId: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
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
      target: Schema.Struct({
        id: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        ownerType: Schema.Literals(["GUILD", "USER"]),
        ownerId: Schema.String,
        provider: Schema.Literal("DISCORD"),
        targetType: Schema.Literals(["CHANNEL", "DM"]),
        externalId: Schema.String,
        displayName: Schema.Union([Schema.String, Schema.Null]),
        guildName: Schema.Union([Schema.String, Schema.Null]),
        metadata: Schema.Union([
          Schema.Union([
            Schema.String,
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Boolean,
            Schema.Array(NotificationRuleResponseDto__schema0),
            Schema.Record(Schema.String, NotificationRuleResponseDto__schema0),
          ]),
          Schema.Null,
        ]),
        active: Schema.Boolean,
        canSend: Schema.Boolean,
        lastSyncedAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        lastDeliveryAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
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
    }),
  ),
}).annotate({ identifier: "NotificationRuleResponseDto" });

export type UpdateNotificationRuleDto = {
  readonly name?: string | null;
  readonly contentTemplate?: string | null;
  readonly triggerType?:
    | "TIMER_BEFORE_SPAWN"
    | "NPC_SPAWNED"
    | "WATCHED_ITEM_DROPPED"
    | "SCHEDULED_MESSAGE";
  readonly world?: string;
  readonly npcId?: number;
  readonly npcIds?: ReadonlyArray<number>;
  readonly itemId?: number;
  readonly itemIds?: ReadonlyArray<number>;
  readonly scheduleStrategy?: "SPAWN_WINDOW_RELATIVE" | "FIXED_DATETIME";
  readonly scheduleAnchor?: "MIN_SPAWN" | "MAX_SPAWN";
  readonly scheduleOffsetMinutes?: number;
  readonly scheduledAt?: string;
  readonly scheduleIntervalType?: "ONCE" | "HOURLY" | "DAILY" | "WEEKLY";
  readonly scheduleIntervalValue?: number;
  readonly scheduleWeekday?: number;
  readonly scheduleTimeOfDay?: string;
  readonly scheduledUntil?: string;
  readonly scheduleTimezone?: string;
  readonly targetIds?: ReadonlyArray<number>;
  readonly enabled?: boolean;
};

export const UpdateNotificationRuleDto = Schema.Struct({
  name: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.isMaxLength(255).annotate({
          expected: "a value with a length of at most 255",
        }),
      ),
      Schema.Null,
    ]),
  ),
  contentTemplate: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(
        Schema.isMaxLength(4000).annotate({
          expected: "a value with a length of at most 4000",
        }),
      ),
      Schema.Null,
    ]),
  ),
  triggerType: Schema.optionalKey(
    Schema.Literals([
      "TIMER_BEFORE_SPAWN",
      "NPC_SPAWNED",
      "WATCHED_ITEM_DROPPED",
      "SCHEDULED_MESSAGE",
    ]),
  ),
  world: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  npcId: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  npcIds: Schema.optionalKey(
    Schema.Array(
      Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
    ).check(
      Schema.isMaxLength(5).annotate({
        expected: "a value with a length of at most 5",
      }),
    ),
  ),
  itemId: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
  ),
  itemIds: Schema.optionalKey(
    Schema.Array(
      Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
    ).check(
      Schema.isMaxLength(20).annotate({
        expected: "a value with a length of at most 20",
      }),
    ),
  ),
  scheduleStrategy: Schema.optionalKey(
    Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
  ),
  scheduleAnchor: Schema.optionalKey(
    Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
  ),
  scheduleOffsetMinutes: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(1440).annotate({
          expected: "a value less than or equal to 1440",
        }),
      ),
  ),
  scheduledAt: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  scheduleIntervalType: Schema.optionalKey(
    Schema.Literals(["ONCE", "HOURLY", "DAILY", "WEEKLY"]),
  ),
  scheduleIntervalValue: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(24).annotate({
          expected: "a value less than or equal to 24",
        }),
      ),
  ),
  scheduleWeekday: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(6).annotate({
          expected: "a value less than or equal to 6",
        }),
      ),
  ),
  scheduleTimeOfDay: Schema.optionalKey(
    Schema.String.check(
      Schema.isPattern(new RegExp("^\\d{2}:\\d{2}$")).annotate({
        expected: "a string matching the RegExp ^\\d{2}:\\d{2}$",
      }),
    ),
  ),
  scheduledUntil: Schema.optionalKey(
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      }),
    ),
  ),
  scheduleTimezone: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  targetIds: Schema.optionalKey(
    Schema.Array(
      Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
    ).check(
      Schema.isMaxLength(3).annotate({
        expected: "a value with a length of at most 3",
      }),
    ),
  ),
  enabled: Schema.optionalKey(Schema.Boolean),
})
  .check(
    Schema.makeFilter((data) =>
      data.world === undefined || data.world.trim().length > 0
        ? undefined
        : {
            path: ["world"],
            issue: NotificationError.NOTIFICATION_RULE_WORLD_REQUIRED,
          },
    ),
  )
  .check(
    Schema.makeFilter((data) => {
      if (data.npcId === undefined && data.npcIds === undefined)
        return undefined;
      return typeof data.npcId === "number" ||
        (data.npcIds !== undefined && data.npcIds.length > 0)
        ? undefined
        : {
            path: ["npcId"],
            issue:
              NotificationError.NOTIFICATION_RULE_MUST_TARGET_AT_LEAST_ONE_NPC,
          };
    }),
  )
  .annotate({ identifier: "UpdateNotificationRuleDto" });

export type NotificationJobsResponseDto = {
  readonly pending: ReadonlyArray<{
    readonly id: string;
    readonly ruleId: number;
    readonly targetId: number;
    readonly ownerType: "GUILD" | "USER";
    readonly ownerId: string;
    readonly jobKind: "SCHEDULED" | "INSTANT" | "TEST";
    readonly scheduledFor: string;
    readonly status:
      | "PENDING"
      | "PROCESSING"
      | "SENT"
      | "FAILED"
      | "BLOCKED"
      | "CANCELED";
    readonly idempotencyKey: string;
    readonly sourceEntityType: string | null;
    readonly sourceEntityId: string | null;
    readonly sourceEventId: string | null;
    readonly payloadSnapshot:
      | ({
          readonly title?: string | null;
          readonly message?: string | null;
          readonly content?: string | null;
          readonly allowedMentions?: {
            readonly parse?: ReadonlyArray<"roles" | "users" | "everyone">;
            readonly roles?: ReadonlyArray<string>;
            readonly users?: ReadonlyArray<string>;
            readonly repliedUser?: boolean;
          };
          readonly ruleId?: number | null;
          readonly ruleName?: string | null;
          readonly triggerType?:
            | "TIMER_BEFORE_SPAWN"
            | "NPC_SPAWNED"
            | "WATCHED_ITEM_DROPPED"
            | "SCHEDULED_MESSAGE"
            | null;
          readonly world?: string | null;
          readonly npcId?: number | null;
          readonly npcName?: string | null;
          readonly timerKey?: string | null;
          readonly minSpawnTime?: string | null;
          readonly maxSpawnTime?: string | null;
          readonly scheduledFor?: string | null;
          readonly scheduleStrategy?:
            | "SPAWN_WINDOW_RELATIVE"
            | "FIXED_DATETIME"
            | null;
          readonly scheduleAnchor?: "MIN_SPAWN" | "MAX_SPAWN" | null;
          readonly scheduleOffsetMinutes?: number | null;
          readonly contentTemplate?: string | null;
          readonly testTriggeredAt?: string | null;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly attemptCount: number;
    readonly lastError: string | null;
    readonly blockedReason: string | null;
    readonly providerMessageId: string | null;
    readonly processedAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly rule: {
      readonly id: number;
      readonly ownerType: "GUILD" | "USER";
      readonly ownerId: string;
      readonly triggerType:
        | "TIMER_BEFORE_SPAWN"
        | "NPC_SPAWNED"
        | "WATCHED_ITEM_DROPPED"
        | "SCHEDULED_MESSAGE";
      readonly guildId: string | null;
      readonly world: string | null;
      readonly name: string | null;
      readonly filters:
        | ({
            readonly guildIds?: ReadonlyArray<string>;
            readonly world?: string;
            readonly npcId?: number | null;
            readonly npcIds?: ReadonlyArray<number>;
            readonly itemId?: number | null;
            readonly itemIds?: ReadonlyArray<number>;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly contentTemplate: string | null;
      readonly scheduleStrategy:
        | "SPAWN_WINDOW_RELATIVE"
        | "FIXED_DATETIME"
        | null;
      readonly scheduleAnchor: "MIN_SPAWN" | "MAX_SPAWN" | null;
      readonly scheduleOffsetMinutes: number | null;
      readonly scheduledAt: string | null;
      readonly scheduleIntervalType:
        | "ONCE"
        | "HOURLY"
        | "DAILY"
        | "WEEKLY"
        | null;
      readonly scheduleIntervalValue: number | null;
      readonly scheduleWeekday: number | null;
      readonly scheduleTimeOfDay: string | null;
      readonly scheduledUntil: string | null;
      readonly scheduleTimezone: string | null;
      readonly enabled: boolean;
      readonly dedupeWindowSeconds: number;
      readonly createdAt: string;
      readonly updatedAt: string;
    };
    readonly target: {
      readonly id: number;
      readonly ownerType: "GUILD" | "USER";
      readonly ownerId: string;
      readonly provider: "DISCORD";
      readonly targetType: "CHANNEL" | "DM";
      readonly externalId: string;
      readonly displayName: string | null;
      readonly guildName: string | null;
      readonly metadata:
        | string
        | number
        | boolean
        | ReadonlyArray<NotificationJobsResponseDto__schema0>
        | { readonly [x: string]: NotificationJobsResponseDto__schema0 }
        | null;
      readonly active: boolean;
      readonly canSend: boolean;
      readonly lastSyncedAt: string | null;
      readonly lastDeliveryAt: string | null;
      readonly lastDeliveryError: string | null;
      readonly createdAt: string;
      readonly updatedAt: string;
    };
  }>;
  readonly history: ReadonlyArray<{
    readonly id: string;
    readonly ruleId: number;
    readonly targetId: number;
    readonly ownerType: "GUILD" | "USER";
    readonly ownerId: string;
    readonly jobKind: "SCHEDULED" | "INSTANT" | "TEST";
    readonly scheduledFor: string;
    readonly status:
      | "PENDING"
      | "PROCESSING"
      | "SENT"
      | "FAILED"
      | "BLOCKED"
      | "CANCELED";
    readonly idempotencyKey: string;
    readonly sourceEntityType: string | null;
    readonly sourceEntityId: string | null;
    readonly sourceEventId: string | null;
    readonly payloadSnapshot:
      | ({
          readonly title?: string | null;
          readonly message?: string | null;
          readonly content?: string | null;
          readonly allowedMentions?: {
            readonly parse?: ReadonlyArray<"roles" | "users" | "everyone">;
            readonly roles?: ReadonlyArray<string>;
            readonly users?: ReadonlyArray<string>;
            readonly repliedUser?: boolean;
          };
          readonly ruleId?: number | null;
          readonly ruleName?: string | null;
          readonly triggerType?:
            | "TIMER_BEFORE_SPAWN"
            | "NPC_SPAWNED"
            | "WATCHED_ITEM_DROPPED"
            | "SCHEDULED_MESSAGE"
            | null;
          readonly world?: string | null;
          readonly npcId?: number | null;
          readonly npcName?: string | null;
          readonly timerKey?: string | null;
          readonly minSpawnTime?: string | null;
          readonly maxSpawnTime?: string | null;
          readonly scheduledFor?: string | null;
          readonly scheduleStrategy?:
            | "SPAWN_WINDOW_RELATIVE"
            | "FIXED_DATETIME"
            | null;
          readonly scheduleAnchor?: "MIN_SPAWN" | "MAX_SPAWN" | null;
          readonly scheduleOffsetMinutes?: number | null;
          readonly contentTemplate?: string | null;
          readonly testTriggeredAt?: string | null;
        } & { readonly [x: string]: Schema.Json })
      | null;
    readonly attemptCount: number;
    readonly lastError: string | null;
    readonly blockedReason: string | null;
    readonly providerMessageId: string | null;
    readonly processedAt: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly rule: {
      readonly id: number;
      readonly ownerType: "GUILD" | "USER";
      readonly ownerId: string;
      readonly triggerType:
        | "TIMER_BEFORE_SPAWN"
        | "NPC_SPAWNED"
        | "WATCHED_ITEM_DROPPED"
        | "SCHEDULED_MESSAGE";
      readonly guildId: string | null;
      readonly world: string | null;
      readonly name: string | null;
      readonly filters:
        | ({
            readonly guildIds?: ReadonlyArray<string>;
            readonly world?: string;
            readonly npcId?: number | null;
            readonly npcIds?: ReadonlyArray<number>;
            readonly itemId?: number | null;
            readonly itemIds?: ReadonlyArray<number>;
          } & { readonly [x: string]: Schema.Json })
        | null;
      readonly contentTemplate: string | null;
      readonly scheduleStrategy:
        | "SPAWN_WINDOW_RELATIVE"
        | "FIXED_DATETIME"
        | null;
      readonly scheduleAnchor: "MIN_SPAWN" | "MAX_SPAWN" | null;
      readonly scheduleOffsetMinutes: number | null;
      readonly scheduledAt: string | null;
      readonly scheduleIntervalType:
        | "ONCE"
        | "HOURLY"
        | "DAILY"
        | "WEEKLY"
        | null;
      readonly scheduleIntervalValue: number | null;
      readonly scheduleWeekday: number | null;
      readonly scheduleTimeOfDay: string | null;
      readonly scheduledUntil: string | null;
      readonly scheduleTimezone: string | null;
      readonly enabled: boolean;
      readonly dedupeWindowSeconds: number;
      readonly createdAt: string;
      readonly updatedAt: string;
    };
    readonly target: {
      readonly id: number;
      readonly ownerType: "GUILD" | "USER";
      readonly ownerId: string;
      readonly provider: "DISCORD";
      readonly targetType: "CHANNEL" | "DM";
      readonly externalId: string;
      readonly displayName: string | null;
      readonly guildName: string | null;
      readonly metadata:
        | string
        | number
        | boolean
        | ReadonlyArray<NotificationJobsResponseDto__schema0>
        | { readonly [x: string]: NotificationJobsResponseDto__schema0 }
        | null;
      readonly active: boolean;
      readonly canSend: boolean;
      readonly lastSyncedAt: string | null;
      readonly lastDeliveryAt: string | null;
      readonly lastDeliveryError: string | null;
      readonly createdAt: string;
      readonly updatedAt: string;
    };
  }>;
};

export const NotificationJobsResponseDto = Schema.Struct({
  pending: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      ruleId: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      targetId: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      ownerType: Schema.Literals(["GUILD", "USER"]),
      ownerId: Schema.String,
      jobKind: Schema.Literals(["SCHEDULED", "INSTANT", "TEST"]),
      scheduledFor: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      status: Schema.Literals([
        "PENDING",
        "PROCESSING",
        "SENT",
        "FAILED",
        "BLOCKED",
        "CANCELED",
      ]),
      idempotencyKey: Schema.String,
      sourceEntityType: Schema.Union([Schema.String, Schema.Null]),
      sourceEntityId: Schema.Union([Schema.String, Schema.Null]),
      sourceEventId: Schema.Union([Schema.String, Schema.Null]),
      payloadSnapshot: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            title: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            message: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            content: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            allowedMentions: Schema.optionalKey(
              Schema.Struct({
                parse: Schema.optionalKey(
                  Schema.Array(Schema.Literals(["roles", "users", "everyone"])),
                ),
                roles: Schema.optionalKey(Schema.Array(Schema.String)),
                users: Schema.optionalKey(Schema.Array(Schema.String)),
                repliedUser: Schema.optionalKey(Schema.Boolean),
              }),
            ),
            ruleId: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
                Schema.Null,
              ]),
            ),
            ruleName: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            triggerType: Schema.optionalKey(
              Schema.Union([
                Schema.Literals([
                  "TIMER_BEFORE_SPAWN",
                  "NPC_SPAWNED",
                  "WATCHED_ITEM_DROPPED",
                  "SCHEDULED_MESSAGE",
                ]),
                Schema.Null,
              ]),
            ),
            world: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            npcId: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
                Schema.Null,
              ]),
            ),
            npcName: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            timerKey: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            minSpawnTime: Schema.optionalKey(
              Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                  }),
                ),
                Schema.Null,
              ]),
            ),
            maxSpawnTime: Schema.optionalKey(
              Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                  }),
                ),
                Schema.Null,
              ]),
            ),
            scheduledFor: Schema.optionalKey(
              Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                  }),
                ),
                Schema.Null,
              ]),
            ),
            scheduleStrategy: Schema.optionalKey(
              Schema.Union([
                Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
                Schema.Null,
              ]),
            ),
            scheduleAnchor: Schema.optionalKey(
              Schema.Union([
                Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
                Schema.Null,
              ]),
            ),
            scheduleOffsetMinutes: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
                Schema.Null,
              ]),
            ),
            contentTemplate: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            testTriggeredAt: Schema.optionalKey(
              Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                  }),
                ),
                Schema.Null,
              ]),
            ),
          }),
          [
            Schema.Record(
              Schema.String,
              Schema.Json.annotate({ expected: "JSON value" }),
            ),
          ],
        ),
        Schema.Null,
      ]),
      attemptCount: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      lastError: Schema.Union([Schema.String, Schema.Null]),
      blockedReason: Schema.Union([Schema.String, Schema.Null]),
      providerMessageId: Schema.Union([Schema.String, Schema.Null]),
      processedAt: Schema.Union([
        Schema.String.annotate({ format: "date-time" }).check(
          Schema.isPattern(
            new RegExp(
              "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            ),
          ).annotate({
            expected:
              "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          }),
        ),
        Schema.Null,
      ]),
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
      rule: Schema.Struct({
        id: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        ownerType: Schema.Literals(["GUILD", "USER"]),
        ownerId: Schema.String,
        triggerType: Schema.Literals([
          "TIMER_BEFORE_SPAWN",
          "NPC_SPAWNED",
          "WATCHED_ITEM_DROPPED",
          "SCHEDULED_MESSAGE",
        ]),
        guildId: Schema.Union([Schema.String, Schema.Null]),
        world: Schema.Union([Schema.String, Schema.Null]),
        name: Schema.Union([Schema.String, Schema.Null]),
        filters: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
              world: Schema.optionalKey(Schema.String),
              npcId: Schema.optionalKey(
                Schema.Union([
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                  Schema.Null,
                ]),
              ),
              npcIds: Schema.optionalKey(
                Schema.Array(
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                ),
              ),
              itemId: Schema.optionalKey(
                Schema.Union([
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                  Schema.Null,
                ]),
              ),
              itemIds: Schema.optionalKey(
                Schema.Array(
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                ),
              ),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        contentTemplate: Schema.Union([Schema.String, Schema.Null]),
        scheduleStrategy: Schema.Union([
          Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
          Schema.Null,
        ]),
        scheduleAnchor: Schema.Union([
          Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
          Schema.Null,
        ]),
        scheduleOffsetMinutes: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduledAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        scheduleIntervalType: Schema.Union([
          Schema.Literals(["ONCE", "HOURLY", "DAILY", "WEEKLY"]),
          Schema.Null,
        ]),
        scheduleIntervalValue: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduleWeekday: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduleTimeOfDay: Schema.Union([Schema.String, Schema.Null]),
        scheduledUntil: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        scheduleTimezone: Schema.Union([Schema.String, Schema.Null]),
        enabled: Schema.Boolean,
        dedupeWindowSeconds: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
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
      target: Schema.Struct({
        id: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        ownerType: Schema.Literals(["GUILD", "USER"]),
        ownerId: Schema.String,
        provider: Schema.Literal("DISCORD"),
        targetType: Schema.Literals(["CHANNEL", "DM"]),
        externalId: Schema.String,
        displayName: Schema.Union([Schema.String, Schema.Null]),
        guildName: Schema.Union([Schema.String, Schema.Null]),
        metadata: Schema.Union([
          Schema.Union([
            Schema.String,
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Boolean,
            Schema.Array(NotificationJobsResponseDto__schema0),
            Schema.Record(Schema.String, NotificationJobsResponseDto__schema0),
          ]),
          Schema.Null,
        ]),
        active: Schema.Boolean,
        canSend: Schema.Boolean,
        lastSyncedAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        lastDeliveryAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
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
    }),
  ),
  history: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      ruleId: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      targetId: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      ownerType: Schema.Literals(["GUILD", "USER"]),
      ownerId: Schema.String,
      jobKind: Schema.Literals(["SCHEDULED", "INSTANT", "TEST"]),
      scheduledFor: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      status: Schema.Literals([
        "PENDING",
        "PROCESSING",
        "SENT",
        "FAILED",
        "BLOCKED",
        "CANCELED",
      ]),
      idempotencyKey: Schema.String,
      sourceEntityType: Schema.Union([Schema.String, Schema.Null]),
      sourceEntityId: Schema.Union([Schema.String, Schema.Null]),
      sourceEventId: Schema.Union([Schema.String, Schema.Null]),
      payloadSnapshot: Schema.Union([
        Schema.StructWithRest(
          Schema.Struct({
            title: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            message: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            content: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            allowedMentions: Schema.optionalKey(
              Schema.Struct({
                parse: Schema.optionalKey(
                  Schema.Array(Schema.Literals(["roles", "users", "everyone"])),
                ),
                roles: Schema.optionalKey(Schema.Array(Schema.String)),
                users: Schema.optionalKey(Schema.Array(Schema.String)),
                repliedUser: Schema.optionalKey(Schema.Boolean),
              }),
            ),
            ruleId: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
                Schema.Null,
              ]),
            ),
            ruleName: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            triggerType: Schema.optionalKey(
              Schema.Union([
                Schema.Literals([
                  "TIMER_BEFORE_SPAWN",
                  "NPC_SPAWNED",
                  "WATCHED_ITEM_DROPPED",
                  "SCHEDULED_MESSAGE",
                ]),
                Schema.Null,
              ]),
            ),
            world: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            npcId: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
                Schema.Null,
              ]),
            ),
            npcName: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            timerKey: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            minSpawnTime: Schema.optionalKey(
              Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                  }),
                ),
                Schema.Null,
              ]),
            ),
            maxSpawnTime: Schema.optionalKey(
              Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                  }),
                ),
                Schema.Null,
              ]),
            ),
            scheduledFor: Schema.optionalKey(
              Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                  }),
                ),
                Schema.Null,
              ]),
            ),
            scheduleStrategy: Schema.optionalKey(
              Schema.Union([
                Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
                Schema.Null,
              ]),
            ),
            scheduleAnchor: Schema.optionalKey(
              Schema.Union([
                Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
                Schema.Null,
              ]),
            ),
            scheduleOffsetMinutes: Schema.optionalKey(
              Schema.Union([
                Schema.Number.check(
                  Schema.isInt().annotate({ expected: "an integer" }),
                )
                  .check(
                    Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                      expected:
                        "a value greater than or equal to -9007199254740991",
                    }),
                  )
                  .check(
                    Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                      expected:
                        "a value less than or equal to 9007199254740991",
                    }),
                  ),
                Schema.Null,
              ]),
            ),
            contentTemplate: Schema.optionalKey(
              Schema.Union([Schema.String, Schema.Null]),
            ),
            testTriggeredAt: Schema.optionalKey(
              Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
                  }),
                ),
                Schema.Null,
              ]),
            ),
          }),
          [
            Schema.Record(
              Schema.String,
              Schema.Json.annotate({ expected: "JSON value" }),
            ),
          ],
        ),
        Schema.Null,
      ]),
      attemptCount: Schema.Number.check(
        Schema.isInt().annotate({ expected: "an integer" }),
      )
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
      lastError: Schema.Union([Schema.String, Schema.Null]),
      blockedReason: Schema.Union([Schema.String, Schema.Null]),
      providerMessageId: Schema.Union([Schema.String, Schema.Null]),
      processedAt: Schema.Union([
        Schema.String.annotate({ format: "date-time" }).check(
          Schema.isPattern(
            new RegExp(
              "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            ),
          ).annotate({
            expected:
              "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          }),
        ),
        Schema.Null,
      ]),
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
      rule: Schema.Struct({
        id: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        ownerType: Schema.Literals(["GUILD", "USER"]),
        ownerId: Schema.String,
        triggerType: Schema.Literals([
          "TIMER_BEFORE_SPAWN",
          "NPC_SPAWNED",
          "WATCHED_ITEM_DROPPED",
          "SCHEDULED_MESSAGE",
        ]),
        guildId: Schema.Union([Schema.String, Schema.Null]),
        world: Schema.Union([Schema.String, Schema.Null]),
        name: Schema.Union([Schema.String, Schema.Null]),
        filters: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
              world: Schema.optionalKey(Schema.String),
              npcId: Schema.optionalKey(
                Schema.Union([
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                  Schema.Null,
                ]),
              ),
              npcIds: Schema.optionalKey(
                Schema.Array(
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                ),
              ),
              itemId: Schema.optionalKey(
                Schema.Union([
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                  Schema.Null,
                ]),
              ),
              itemIds: Schema.optionalKey(
                Schema.Array(
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                ),
              ),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        contentTemplate: Schema.Union([Schema.String, Schema.Null]),
        scheduleStrategy: Schema.Union([
          Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
          Schema.Null,
        ]),
        scheduleAnchor: Schema.Union([
          Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
          Schema.Null,
        ]),
        scheduleOffsetMinutes: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduledAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        scheduleIntervalType: Schema.Union([
          Schema.Literals(["ONCE", "HOURLY", "DAILY", "WEEKLY"]),
          Schema.Null,
        ]),
        scheduleIntervalValue: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduleWeekday: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduleTimeOfDay: Schema.Union([Schema.String, Schema.Null]),
        scheduledUntil: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        scheduleTimezone: Schema.Union([Schema.String, Schema.Null]),
        enabled: Schema.Boolean,
        dedupeWindowSeconds: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
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
      target: Schema.Struct({
        id: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        ownerType: Schema.Literals(["GUILD", "USER"]),
        ownerId: Schema.String,
        provider: Schema.Literal("DISCORD"),
        targetType: Schema.Literals(["CHANNEL", "DM"]),
        externalId: Schema.String,
        displayName: Schema.Union([Schema.String, Schema.Null]),
        guildName: Schema.Union([Schema.String, Schema.Null]),
        metadata: Schema.Union([
          Schema.Union([
            Schema.String,
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Boolean,
            Schema.Array(NotificationJobsResponseDto__schema0),
            Schema.Record(Schema.String, NotificationJobsResponseDto__schema0),
          ]),
          Schema.Null,
        ]),
        active: Schema.Boolean,
        canSend: Schema.Boolean,
        lastSyncedAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        lastDeliveryAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
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
    }),
  ),
}).annotate({ identifier: "NotificationJobsResponseDto" });

export type NotificationTargetWithTestTriggerResponseDto = {
  readonly id: number;
  readonly ownerType: "GUILD" | "USER";
  readonly ownerId: string;
  readonly provider: "DISCORD";
  readonly targetType: "CHANNEL" | "DM";
  readonly externalId: string;
  readonly displayName: string | null;
  readonly guildName: string | null;
  readonly metadata:
    | string
    | number
    | boolean
    | ReadonlyArray<NotificationTargetWithTestTriggerResponseDto__schema0>
    | {
        readonly [x: string]: NotificationTargetWithTestTriggerResponseDto__schema0;
      }
    | null;
  readonly active: boolean;
  readonly canSend: boolean;
  readonly lastSyncedAt: string | null;
  readonly lastDeliveryAt: string | null;
  readonly lastDeliveryError: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly testTrigger: {
    readonly limit: number;
    readonly used: number;
    readonly remaining: number;
    readonly windowSeconds: number;
    readonly nextAvailableAt: string | null;
  };
};

export const NotificationTargetWithTestTriggerResponseDto = Schema.Struct({
  id: Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  ownerType: Schema.Literals(["GUILD", "USER"]),
  ownerId: Schema.String,
  provider: Schema.Literal("DISCORD"),
  targetType: Schema.Literals(["CHANNEL", "DM"]),
  externalId: Schema.String,
  displayName: Schema.Union([Schema.String, Schema.Null]),
  guildName: Schema.Union([Schema.String, Schema.Null]),
  metadata: Schema.Union([
    Schema.Union([
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Boolean,
      Schema.Array(NotificationTargetWithTestTriggerResponseDto__schema0),
      Schema.Record(
        Schema.String,
        NotificationTargetWithTestTriggerResponseDto__schema0,
      ),
    ]),
    Schema.Null,
  ]),
  active: Schema.Boolean,
  canSend: Schema.Boolean,
  lastSyncedAt: Schema.Union([
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    Schema.Null,
  ]),
  lastDeliveryAt: Schema.Union([
    Schema.String.annotate({ format: "date-time" }).check(
      Schema.isPattern(
        new RegExp(
          "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        ),
      ).annotate({
        expected:
          "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      }),
    ),
    Schema.Null,
  ]),
  lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
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
  testTrigger: Schema.Struct({
    limit: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    used: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    remaining: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    windowSeconds: Schema.Number.check(
      Schema.isInt().annotate({ expected: "an integer" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    nextAvailableAt: Schema.Union([
      Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
        }),
      ),
      Schema.Null,
    ]),
  }),
}).annotate({ identifier: "NotificationTargetWithTestTriggerResponseDto" });

export type WatchedItemResponseDto = {
  readonly id: number;
  readonly userId: string;
  readonly itemId: number;
  readonly itemName: string;
  readonly world: string;
  readonly enabled: boolean;
  readonly notificationRuleId: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly itemSnapshot:
    | ({
        readonly name: string;
        readonly icon: string;
        readonly rarity: string | null;
        readonly lvl: number | null;
        readonly type: string | null;
        readonly stat: string;
      } & { readonly [x: string]: Schema.Json })
    | null;
  readonly notificationRule:
    | ({
        readonly id: number;
        readonly ownerType: "GUILD" | "USER";
        readonly ownerId: string;
        readonly triggerType:
          | "TIMER_BEFORE_SPAWN"
          | "NPC_SPAWNED"
          | "WATCHED_ITEM_DROPPED"
          | "SCHEDULED_MESSAGE";
        readonly guildId: string | null;
        readonly world: string | null;
        readonly name: string | null;
        readonly filters:
          | ({
              readonly guildIds?: ReadonlyArray<string>;
              readonly world?: string;
              readonly npcId?: number | null;
              readonly npcIds?: ReadonlyArray<number>;
              readonly itemId?: number | null;
              readonly itemIds?: ReadonlyArray<number>;
            } & { readonly [x: string]: Schema.Json })
          | null;
        readonly contentTemplate: string | null;
        readonly scheduleStrategy:
          | "SPAWN_WINDOW_RELATIVE"
          | "FIXED_DATETIME"
          | null;
        readonly scheduleAnchor: "MIN_SPAWN" | "MAX_SPAWN" | null;
        readonly scheduleOffsetMinutes: number | null;
        readonly scheduledAt: string | null;
        readonly scheduleIntervalType:
          | "ONCE"
          | "HOURLY"
          | "DAILY"
          | "WEEKLY"
          | null;
        readonly scheduleIntervalValue: number | null;
        readonly scheduleWeekday: number | null;
        readonly scheduleTimeOfDay: string | null;
        readonly scheduledUntil: string | null;
        readonly scheduleTimezone: string | null;
        readonly enabled: boolean;
        readonly dedupeWindowSeconds: number;
        readonly createdAt: string;
        readonly updatedAt: string;
        readonly targets: ReadonlyArray<{
          readonly ruleId: number;
          readonly targetId: number;
          readonly createdAt: string;
          readonly target: {
            readonly id: number;
            readonly ownerType: "GUILD" | "USER";
            readonly ownerId: string;
            readonly provider: "DISCORD";
            readonly targetType: "CHANNEL" | "DM";
            readonly externalId: string;
            readonly displayName: string | null;
            readonly guildName: string | null;
            readonly metadata:
              | string
              | number
              | boolean
              | ReadonlyArray<WatchedItemResponseDto__schema0>
              | { readonly [x: string]: WatchedItemResponseDto__schema0 }
              | null;
            readonly active: boolean;
            readonly canSend: boolean;
            readonly lastSyncedAt: string | null;
            readonly lastDeliveryAt: string | null;
            readonly lastDeliveryError: string | null;
            readonly createdAt: string;
            readonly updatedAt: string;
          };
        }>;
      } & { readonly [x: string]: Schema.Json })
    | null;
};

export const WatchedItemResponseDto = Schema.Struct({
  id: Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  userId: Schema.String,
  itemId: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  itemName: Schema.String,
  world: Schema.String,
  enabled: Schema.Boolean,
  notificationRuleId: Schema.Union([
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
      .check(
        Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
          expected: "a value greater than or equal to -9007199254740991",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(9007199254740991).annotate({
          expected: "a value less than or equal to 9007199254740991",
        }),
      ),
    Schema.Null,
  ]),
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
  itemSnapshot: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        name: Schema.String,
        icon: Schema.String,
        rarity: Schema.Union([Schema.String, Schema.Null]),
        lvl: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        type: Schema.Union([Schema.String, Schema.Null]),
        stat: Schema.String,
      }),
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
  notificationRule: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        id: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        ownerType: Schema.Literals(["GUILD", "USER"]),
        ownerId: Schema.String,
        triggerType: Schema.Literals([
          "TIMER_BEFORE_SPAWN",
          "NPC_SPAWNED",
          "WATCHED_ITEM_DROPPED",
          "SCHEDULED_MESSAGE",
        ]),
        guildId: Schema.Union([Schema.String, Schema.Null]),
        world: Schema.Union([Schema.String, Schema.Null]),
        name: Schema.Union([Schema.String, Schema.Null]),
        filters: Schema.Union([
          Schema.StructWithRest(
            Schema.Struct({
              guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
              world: Schema.optionalKey(Schema.String),
              npcId: Schema.optionalKey(
                Schema.Union([
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                  Schema.Null,
                ]),
              ),
              npcIds: Schema.optionalKey(
                Schema.Array(
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                ),
              ),
              itemId: Schema.optionalKey(
                Schema.Union([
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                  Schema.Null,
                ]),
              ),
              itemIds: Schema.optionalKey(
                Schema.Array(
                  Schema.Number.check(
                    Schema.isInt().annotate({ expected: "an integer" }),
                  )
                    .check(
                      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate(
                        {
                          expected:
                            "a value greater than or equal to -9007199254740991",
                        },
                      ),
                    )
                    .check(
                      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                        expected:
                          "a value less than or equal to 9007199254740991",
                      }),
                    ),
                ),
              ),
            }),
            [
              Schema.Record(
                Schema.String,
                Schema.Json.annotate({ expected: "JSON value" }),
              ),
            ],
          ),
          Schema.Null,
        ]),
        contentTemplate: Schema.Union([Schema.String, Schema.Null]),
        scheduleStrategy: Schema.Union([
          Schema.Literals(["SPAWN_WINDOW_RELATIVE", "FIXED_DATETIME"]),
          Schema.Null,
        ]),
        scheduleAnchor: Schema.Union([
          Schema.Literals(["MIN_SPAWN", "MAX_SPAWN"]),
          Schema.Null,
        ]),
        scheduleOffsetMinutes: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduledAt: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        scheduleIntervalType: Schema.Union([
          Schema.Literals(["ONCE", "HOURLY", "DAILY", "WEEKLY"]),
          Schema.Null,
        ]),
        scheduleIntervalValue: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduleWeekday: Schema.Union([
          Schema.Number.check(
            Schema.isInt().annotate({ expected: "an integer" }),
          )
            .check(
              Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                expected: "a value greater than or equal to -9007199254740991",
              }),
            )
            .check(
              Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                expected: "a value less than or equal to 9007199254740991",
              }),
            ),
          Schema.Null,
        ]),
        scheduleTimeOfDay: Schema.Union([Schema.String, Schema.Null]),
        scheduledUntil: Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
        scheduleTimezone: Schema.Union([Schema.String, Schema.Null]),
        enabled: Schema.Boolean,
        dedupeWindowSeconds: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
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
        targets: Schema.Array(
          Schema.Struct({
            ruleId: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
            targetId: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
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
            target: Schema.Struct({
              id: Schema.Number.check(
                Schema.isInt().annotate({ expected: "an integer" }),
              )
                .check(
                  Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                    expected:
                      "a value greater than or equal to -9007199254740991",
                  }),
                )
                .check(
                  Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                    expected: "a value less than or equal to 9007199254740991",
                  }),
                ),
              ownerType: Schema.Literals(["GUILD", "USER"]),
              ownerId: Schema.String,
              provider: Schema.Literal("DISCORD"),
              targetType: Schema.Literals(["CHANNEL", "DM"]),
              externalId: Schema.String,
              displayName: Schema.Union([Schema.String, Schema.Null]),
              guildName: Schema.Union([Schema.String, Schema.Null]),
              metadata: Schema.Union([
                Schema.Union([
                  Schema.String,
                  Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                  Schema.Boolean,
                  Schema.Array(WatchedItemResponseDto__schema0),
                  Schema.Record(Schema.String, WatchedItemResponseDto__schema0),
                ]),
                Schema.Null,
              ]),
              active: Schema.Boolean,
              canSend: Schema.Boolean,
              lastSyncedAt: Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                  }),
                ),
                Schema.Null,
              ]),
              lastDeliveryAt: Schema.Union([
                Schema.String.annotate({ format: "date-time" }).check(
                  Schema.isPattern(
                    new RegExp(
                      "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                    ),
                  ).annotate({
                    expected:
                      "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
                  }),
                ),
                Schema.Null,
              ]),
              lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
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
          }),
        ),
      }),
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "WatchedItemResponseDto" });

export type CreateWatchedItemDto = {
  readonly itemId: number;
  readonly itemName: string;
  readonly world: string;
  readonly guildIds: ReadonlyArray<string>;
};

export const CreateWatchedItemDto = Schema.Struct({
  itemId: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  itemName: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  guildIds: Schema.Array(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  )
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isMaxLength(20).annotate({
        expected: "a value with a length of at most 20",
      }),
    ),
}).annotate({ identifier: "CreateWatchedItemDto" });

export type CreateWatchedItemQuickAddDto = {
  readonly itemId: number;
  readonly itemName: string;
  readonly world: string;
  readonly guildId: string;
};

export const CreateWatchedItemQuickAddDto = Schema.Struct({
  itemId: Schema.Number.check(
    Schema.isInt().annotate({ expected: "an integer" }),
  )
    .check(
      Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
        expected: "a value greater than or equal to -9007199254740991",
      }),
    )
    .check(
      Schema.isLessThanOrEqualTo(9007199254740991).annotate({
        expected: "a value less than or equal to 9007199254740991",
      }),
    ),
  itemName: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  guildId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
}).annotate({ identifier: "CreateWatchedItemQuickAddDto" });

const __recursive_NotificationTargetResponseDto__schema0 = Schema.Union([
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
              (): Schema.Codec<NotificationTargetResponseDto__schema0> =>
                NotificationTargetResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<NotificationTargetResponseDto__schema0> =>
                NotificationTargetResponseDto__schema0,
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
              (): Schema.Codec<NotificationTargetResponseDto__schema0> =>
                NotificationTargetResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<NotificationTargetResponseDto__schema0> =>
                NotificationTargetResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "NotificationTargetResponseDto__schema0" });

const __recursive_GuildNotificationRulesResponseDto__schema0 = Schema.Union([
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
              (): Schema.Codec<GuildNotificationRulesResponseDto__schema0> =>
                GuildNotificationRulesResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<GuildNotificationRulesResponseDto__schema0> =>
                GuildNotificationRulesResponseDto__schema0,
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
              (): Schema.Codec<GuildNotificationRulesResponseDto__schema0> =>
                GuildNotificationRulesResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<GuildNotificationRulesResponseDto__schema0> =>
                GuildNotificationRulesResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "GuildNotificationRulesResponseDto__schema0" });

const __recursive_NotificationRuleResponseDto__schema0 = Schema.Union([
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
              (): Schema.Codec<NotificationRuleResponseDto__schema0> =>
                NotificationRuleResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<NotificationRuleResponseDto__schema0> =>
                NotificationRuleResponseDto__schema0,
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
              (): Schema.Codec<NotificationRuleResponseDto__schema0> =>
                NotificationRuleResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<NotificationRuleResponseDto__schema0> =>
                NotificationRuleResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "NotificationRuleResponseDto__schema0" });

const __recursive_NotificationJobsResponseDto__schema0 = Schema.Union([
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
              (): Schema.Codec<NotificationJobsResponseDto__schema0> =>
                NotificationJobsResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<NotificationJobsResponseDto__schema0> =>
                NotificationJobsResponseDto__schema0,
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
              (): Schema.Codec<NotificationJobsResponseDto__schema0> =>
                NotificationJobsResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<NotificationJobsResponseDto__schema0> =>
                NotificationJobsResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "NotificationJobsResponseDto__schema0" });

const __recursive_NotificationTargetWithTestTriggerResponseDto__schema0 =
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
                (): Schema.Codec<NotificationTargetWithTestTriggerResponseDto__schema0> =>
                  NotificationTargetWithTestTriggerResponseDto__schema0,
              ),
            ),
            Schema.Record(
              Schema.String,
              Schema.suspend(
                (): Schema.Codec<NotificationTargetWithTestTriggerResponseDto__schema0> =>
                  NotificationTargetWithTestTriggerResponseDto__schema0,
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
                (): Schema.Codec<NotificationTargetWithTestTriggerResponseDto__schema0> =>
                  NotificationTargetWithTestTriggerResponseDto__schema0,
              ),
            ),
            Schema.Record(
              Schema.String,
              Schema.suspend(
                (): Schema.Codec<NotificationTargetWithTestTriggerResponseDto__schema0> =>
                  NotificationTargetWithTestTriggerResponseDto__schema0,
              ),
            ),
          ]),
          Schema.Null,
        ]),
      ),
    ]),
    Schema.Null,
  ]).annotate({
    identifier: "NotificationTargetWithTestTriggerResponseDto__schema0",
  });

const __recursive_WatchedItemResponseDto__schema0 = Schema.Union([
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
              (): Schema.Codec<WatchedItemResponseDto__schema0> =>
                WatchedItemResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<WatchedItemResponseDto__schema0> =>
                WatchedItemResponseDto__schema0,
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
              (): Schema.Codec<WatchedItemResponseDto__schema0> =>
                WatchedItemResponseDto__schema0,
            ),
          ),
          Schema.Record(
            Schema.String,
            Schema.suspend(
              (): Schema.Codec<WatchedItemResponseDto__schema0> =>
                WatchedItemResponseDto__schema0,
            ),
          ),
        ]),
        Schema.Null,
      ]),
    ),
  ]),
  Schema.Null,
]).annotate({ identifier: "WatchedItemResponseDto__schema0" });

export type NotificationsGuildControllerGetGuildTargetsPathParams = {
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerGetGuildTargetsPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerGetGuildTargets200 =
  ReadonlyArray<NotificationTargetResponseDto>;

export const NotificationsGuildControllerGetGuildTargets200 = Schema.Array(
  NotificationTargetResponseDto,
);

export type NotificationsGuildControllerCreateGuildTargetPathParams = {
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerCreateGuildTargetPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerCreateGuildTargetRequestJson =
  CreateNotificationTargetDto;

export const NotificationsGuildControllerCreateGuildTargetRequestJson =
  CreateNotificationTargetDto;

export type NotificationsGuildControllerCreateGuildTarget201 =
  NotificationTargetResponseDto;

export const NotificationsGuildControllerCreateGuildTarget201 =
  NotificationTargetResponseDto;

export type NotificationsGuildControllerGetAvailableGuildTargetsPathParams = {
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerGetAvailableGuildTargetsPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerGetAvailableGuildTargets200 =
  GuildAvailableNotificationTargetsResponseDto;

export const NotificationsGuildControllerGetAvailableGuildTargets200 =
  GuildAvailableNotificationTargetsResponseDto;

export type NotificationsGuildControllerDeleteGuildTargetPathParams = {
  readonly targetId: number;
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerDeleteGuildTargetPathParams =
  Schema.Struct({
    targetId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerDeleteGuildTarget200 =
  SuccessResponseDto_Output;

export const NotificationsGuildControllerDeleteGuildTarget200 =
  SuccessResponseDto_Output;

export type NotificationsGuildControllerUpdateGuildTargetPathParams = {
  readonly targetId: number;
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerUpdateGuildTargetPathParams =
  Schema.Struct({
    targetId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerUpdateGuildTargetRequestJson =
  UpdateNotificationTargetDto;

export const NotificationsGuildControllerUpdateGuildTargetRequestJson =
  UpdateNotificationTargetDto;

export type NotificationsGuildControllerUpdateGuildTarget200 =
  NotificationTargetResponseDto;

export const NotificationsGuildControllerUpdateGuildTarget200 =
  NotificationTargetResponseDto;

export type NotificationsGuildControllerGetGuildRulesPathParams = {
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerGetGuildRulesPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerGetGuildRules200 =
  GuildNotificationRulesResponseDto;

export const NotificationsGuildControllerGetGuildRules200 =
  GuildNotificationRulesResponseDto;

export type NotificationsGuildControllerCreateGuildRulePathParams = {
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerCreateGuildRulePathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerCreateGuildRuleRequestJson =
  CreateNotificationRuleDto;

export const NotificationsGuildControllerCreateGuildRuleRequestJson =
  CreateNotificationRuleDto;

export type NotificationsGuildControllerCreateGuildRule201 =
  NotificationRuleResponseDto;

export const NotificationsGuildControllerCreateGuildRule201 =
  NotificationRuleResponseDto;

export type NotificationsGuildControllerDeleteGuildRulePathParams = {
  readonly ruleId: number;
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerDeleteGuildRulePathParams =
  Schema.Struct({
    ruleId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerDeleteGuildRule200 =
  SuccessResponseDto_Output;

export const NotificationsGuildControllerDeleteGuildRule200 =
  SuccessResponseDto_Output;

export type NotificationsGuildControllerUpdateGuildRulePathParams = {
  readonly ruleId: number;
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerUpdateGuildRulePathParams =
  Schema.Struct({
    ruleId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerUpdateGuildRuleRequestJson =
  UpdateNotificationRuleDto;

export const NotificationsGuildControllerUpdateGuildRuleRequestJson =
  UpdateNotificationRuleDto;

export type NotificationsGuildControllerUpdateGuildRule200 =
  NotificationRuleResponseDto;

export const NotificationsGuildControllerUpdateGuildRule200 =
  NotificationRuleResponseDto;

export type NotificationsGuildControllerRebuildGuildRuleJobsPathParams = {
  readonly ruleId: number;
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerRebuildGuildRuleJobsPathParams =
  Schema.Struct({
    ruleId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerRebuildGuildRuleJobs201 =
  SuccessResponseDto_Output;

export const NotificationsGuildControllerRebuildGuildRuleJobs201 =
  SuccessResponseDto_Output;

export type NotificationsGuildControllerTriggerGuildRuleTestPathParams = {
  readonly ruleId: number;
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerTriggerGuildRuleTestPathParams =
  Schema.Struct({
    ruleId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerTriggerGuildRuleTest201 =
  SuccessResponseDto_Output;

export const NotificationsGuildControllerTriggerGuildRuleTest201 =
  SuccessResponseDto_Output;

export type NotificationsGuildControllerGetGuildJobsPathParams = {
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerGetGuildJobsPathParams = Schema.Struct(
  { guildId: Schema.Json.annotate({ expected: "JSON value" }) },
);

export type NotificationsGuildControllerGetGuildJobs200 =
  NotificationJobsResponseDto;

export const NotificationsGuildControllerGetGuildJobs200 =
  NotificationJobsResponseDto;

export type NotificationsGuildControllerCancelGuildJobPathParams = {
  readonly jobId: string;
  readonly guildId: Schema.Json;
};

export const NotificationsGuildControllerCancelGuildJobPathParams =
  Schema.Struct({
    jobId: Schema.String.annotate({ examples: ["job_123"] }),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerCancelGuildJob200 =
  SuccessResponseDto_Output;

export const NotificationsGuildControllerCancelGuildJob200 =
  SuccessResponseDto_Output;

export type NotificationsUserControllerGetUserTargets200 =
  ReadonlyArray<NotificationTargetWithTestTriggerResponseDto>;

export const NotificationsUserControllerGetUserTargets200 = Schema.Array(
  NotificationTargetWithTestTriggerResponseDto,
);

export type NotificationsUserControllerCreateUserTargetRequestJson =
  CreateNotificationTargetDto;

export const NotificationsUserControllerCreateUserTargetRequestJson =
  CreateNotificationTargetDto;

export type NotificationsUserControllerCreateUserTarget201 =
  NotificationTargetResponseDto;

export const NotificationsUserControllerCreateUserTarget201 =
  NotificationTargetResponseDto;

export type NotificationsUserControllerDeleteUserTargetPathParams = {
  readonly targetId: number;
};

export const NotificationsUserControllerDeleteUserTargetPathParams =
  Schema.Struct({
    targetId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  });

export type NotificationsUserControllerDeleteUserTarget200 =
  SuccessResponseDto_Output;

export const NotificationsUserControllerDeleteUserTarget200 =
  SuccessResponseDto_Output;

export type NotificationsUserControllerUpdateUserTargetPathParams = {
  readonly targetId: number;
};

export const NotificationsUserControllerUpdateUserTargetPathParams =
  Schema.Struct({
    targetId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  });

export type NotificationsUserControllerUpdateUserTargetRequestJson =
  UpdateNotificationTargetDto;

export const NotificationsUserControllerUpdateUserTargetRequestJson =
  UpdateNotificationTargetDto;

export type NotificationsUserControllerUpdateUserTarget200 =
  NotificationTargetResponseDto;

export const NotificationsUserControllerUpdateUserTarget200 =
  NotificationTargetResponseDto;

export type NotificationsUserControllerTriggerUserTargetTestPathParams = {
  readonly targetId: number;
};

export const NotificationsUserControllerTriggerUserTargetTestPathParams =
  Schema.Struct({
    targetId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  });

export type NotificationsUserControllerTriggerUserTargetTest201 =
  SuccessResponseDto_Output;

export const NotificationsUserControllerTriggerUserTargetTest201 =
  SuccessResponseDto_Output;

export type NotificationsUserControllerGetUserRules200 =
  ReadonlyArray<NotificationRuleResponseDto>;

export const NotificationsUserControllerGetUserRules200 = Schema.Array(
  NotificationRuleResponseDto,
);

export type NotificationsUserControllerCreateUserRuleRequestJson =
  CreateNotificationRuleDto;

export const NotificationsUserControllerCreateUserRuleRequestJson =
  CreateNotificationRuleDto;

export type NotificationsUserControllerCreateUserRule201 =
  NotificationRuleResponseDto;

export const NotificationsUserControllerCreateUserRule201 =
  NotificationRuleResponseDto;

export type NotificationsUserControllerDeleteUserRulePathParams = {
  readonly ruleId: number;
};

export const NotificationsUserControllerDeleteUserRulePathParams =
  Schema.Struct({
    ruleId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  });

export type NotificationsUserControllerDeleteUserRule200 =
  SuccessResponseDto_Output;

export const NotificationsUserControllerDeleteUserRule200 =
  SuccessResponseDto_Output;

export type NotificationsUserControllerUpdateUserRulePathParams = {
  readonly ruleId: number;
};

export const NotificationsUserControllerUpdateUserRulePathParams =
  Schema.Struct({
    ruleId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  });

export type NotificationsUserControllerUpdateUserRuleRequestJson =
  UpdateNotificationRuleDto;

export const NotificationsUserControllerUpdateUserRuleRequestJson =
  UpdateNotificationRuleDto;

export type NotificationsUserControllerUpdateUserRule200 =
  NotificationRuleResponseDto;

export const NotificationsUserControllerUpdateUserRule200 =
  NotificationRuleResponseDto;

export type NotificationsUserControllerGetUserJobs200 =
  NotificationJobsResponseDto;

export const NotificationsUserControllerGetUserJobs200 =
  NotificationJobsResponseDto;

export type NotificationsUserControllerGetWatchedItems200 =
  ReadonlyArray<WatchedItemResponseDto>;

export const NotificationsUserControllerGetWatchedItems200 = Schema.Array(
  WatchedItemResponseDto,
);

export type NotificationsUserControllerCreateWatchedItemRequestJson =
  CreateWatchedItemDto;

export const NotificationsUserControllerCreateWatchedItemRequestJson =
  CreateWatchedItemDto;

export type NotificationsUserControllerCreateWatchedItem201 =
  WatchedItemResponseDto;

export const NotificationsUserControllerCreateWatchedItem201 =
  WatchedItemResponseDto;

export type NotificationsUserControllerQuickAddWatchedItemRequestJson =
  CreateWatchedItemQuickAddDto;

export const NotificationsUserControllerQuickAddWatchedItemRequestJson =
  CreateWatchedItemQuickAddDto;

export type NotificationsUserControllerQuickAddWatchedItem201 =
  WatchedItemResponseDto;

export const NotificationsUserControllerQuickAddWatchedItem201 =
  WatchedItemResponseDto;

export type NotificationsUserControllerDeleteWatchedItemPathParams = {
  readonly watchedItemId: number;
};

export const NotificationsUserControllerDeleteWatchedItemPathParams =
  Schema.Struct({
    watchedItemId: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  });

export type NotificationsUserControllerDeleteWatchedItem200 =
  SuccessResponseDto_Output;

export const NotificationsUserControllerDeleteWatchedItem200 =
  SuccessResponseDto_Output;
