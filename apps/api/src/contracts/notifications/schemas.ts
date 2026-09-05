import {
  discordPermissionFields,
  DiscordGuildSyncStatus,
} from "@lootlog/schema/discord";
/** Shared input and output schemas for the notifications feature. */
import * as Schema from "effect/Schema";
import {
  NotificationOwnerTypeSchema,
  NotificationProviderSchema,
  NotificationTargetTypeSchema,
  NotificationTriggerTypeSchema,
  NotificationJobStatusSchema,
} from "@lootlog/schema/notifications";
import { Error as NotificationError } from "#src/notifications/error";
import {
  DateTimeWithOffsetString,
  DateTimeString,
  FiniteNumber,
  SafeInteger,
  JsonValue,
  NonEmptyString,
} from "@lootlog/schema/http-scalars";
const NotificationTargetMetadata = JsonValue.annotate({
  identifier: "NotificationTargetResponseDto__schema0",
});

const OrganizationNotificationRuleMetadata = JsonValue.annotate({
  identifier: "GuildNotificationRulesResponseDto__schema0",
});

const NotificationRuleMetadata = JsonValue.annotate({
  identifier: "NotificationRuleResponseDto__schema0",
});

const NotificationJobMetadata = JsonValue.annotate({
  identifier: "NotificationJobsResponseDto__schema0",
});

const NotificationTargetTestMetadata = JsonValue.annotate({
  identifier: "NotificationTargetWithTestTriggerResponseDto__schema0",
});

const WatchedItemMetadata = JsonValue.annotate({
  identifier: "WatchedItemResponseDto__schema0",
});
const notificationTargetFields = (metadata: Schema.Codec<Schema.Json>) => ({
  id: SafeInteger,
  ownerType: NotificationOwnerTypeSchema,
  ownerId: Schema.String,
  provider: NotificationProviderSchema,
  targetType: NotificationTargetTypeSchema,
  externalId: Schema.String,
  displayName: Schema.Union([Schema.String, Schema.Null]),
  guildName: Schema.Union([Schema.String, Schema.Null]),
  metadata,
  active: Schema.Boolean,
  canSend: Schema.Boolean,
  lastSyncedAt: Schema.Union([DateTimeString, Schema.Null]),
  lastDeliveryAt: Schema.Union([DateTimeString, Schema.Null]),
  lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
});

export const NotificationTargetResponse = Schema.Struct(
  notificationTargetFields(NotificationTargetMetadata),
).annotate({ identifier: "NotificationTargetResponseDto" });
export type NotificationTargetResponse = typeof NotificationTargetResponse.Type;

export const CreateNotificationTargetRequest = Schema.Struct({
  targetType: NotificationTargetTypeSchema,
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
export type CreateNotificationTargetRequest =
  typeof CreateNotificationTargetRequest.Type;

export const AvailableOrganizationNotificationTargetsResponse = Schema.Struct({
  channels: Schema.Array(
    Schema.Struct({
      id: SafeInteger,
      guildId: Schema.String,
      channelId: Schema.String,
      name: Schema.String,
      channelType: Schema.String,
      parentId: Schema.Union([Schema.String, Schema.Null]),
      position: SafeInteger,
      active: Schema.Boolean,
      canView: Schema.Boolean,
      canSend: Schema.Boolean,
      ...discordPermissionFields,
      lastSyncedAt: DateTimeString,
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
    }),
  ),
  syncState: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        guildId: Schema.String,
        status: DiscordGuildSyncStatus,
        ...discordPermissionFields,
        channelCount: SafeInteger,
        selectableChannelCount: SafeInteger,
        lastAttemptAt: Schema.Union([DateTimeString, Schema.Null]),
        lastSuccessAt: Schema.Union([DateTimeString, Schema.Null]),
        lastError: Schema.Union([Schema.String, Schema.Null]),
        createdAt: DateTimeString,
        updatedAt: DateTimeString,
      }),
      [Schema.Record(Schema.String, JsonValue)],
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "GuildAvailableNotificationTargetsResponseDto" });
export type AvailableOrganizationNotificationTargetsResponse =
  typeof AvailableOrganizationNotificationTargetsResponse.Type;

export const UpdateNotificationTargetRequest = Schema.Struct({
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
export type UpdateNotificationTargetRequest =
  typeof UpdateNotificationTargetRequest.Type;
const NotificationTestQuota = Schema.Struct({
  limit: SafeInteger,
  used: SafeInteger,
  remaining: SafeInteger,
  windowSeconds: SafeInteger,
  nextAvailableAt: Schema.Union([DateTimeWithOffsetString, Schema.Null]),
});
const notificationRuleFields = {
  id: SafeInteger,
  ownerType: NotificationOwnerTypeSchema,
  ownerId: Schema.String,
  triggerType: NotificationTriggerTypeSchema,
  guildId: Schema.Union([Schema.String, Schema.Null]),
  world: Schema.Union([Schema.String, Schema.Null]),
  name: Schema.Union([Schema.String, Schema.Null]),
  filters: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
        world: Schema.optionalKey(Schema.String),
        npcId: Schema.optionalKey(Schema.Union([SafeInteger, Schema.Null])),
        npcIds: Schema.optionalKey(Schema.Array(SafeInteger)),
        itemId: Schema.optionalKey(Schema.Union([SafeInteger, Schema.Null])),
        itemIds: Schema.optionalKey(Schema.Array(SafeInteger)),
      }),
      [Schema.Record(Schema.String, JsonValue)],
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
  scheduleOffsetMinutes: Schema.Union([SafeInteger, Schema.Null]),
  scheduledAt: Schema.Union([DateTimeString, Schema.Null]),
  scheduleIntervalType: Schema.Union([
    Schema.Literals(["ONCE", "HOURLY", "DAILY", "WEEKLY"]),
    Schema.Null,
  ]),
  scheduleIntervalValue: Schema.Union([SafeInteger, Schema.Null]),
  scheduleWeekday: Schema.Union([SafeInteger, Schema.Null]),
  scheduleTimeOfDay: Schema.Union([Schema.String, Schema.Null]),
  scheduledUntil: Schema.Union([DateTimeString, Schema.Null]),
  scheduleTimezone: Schema.Union([Schema.String, Schema.Null]),
  enabled: Schema.Boolean,
  dedupeWindowSeconds: SafeInteger,
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
};

export const OrganizationNotificationRulesResponse = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      ...notificationRuleFields,
      targets: Schema.Array(
        Schema.Struct({
          ruleId: SafeInteger,
          targetId: SafeInteger,
          createdAt: DateTimeString,
          target: Schema.Struct(
            notificationTargetFields(OrganizationNotificationRuleMetadata),
          ),
        }),
      ),
      testTrigger: NotificationTestQuota,
    }),
  ),
  limits: Schema.Struct({
    ruleLimit: SafeInteger,
    ruleCount: SafeInteger,
    maxNpcsPerRule: SafeInteger,
    testTriggerLimit: SafeInteger,
    testTriggerWindowSeconds: SafeInteger,
  }),
}).annotate({ identifier: "GuildNotificationRulesResponseDto" });
export type OrganizationNotificationRulesResponse =
  typeof OrganizationNotificationRulesResponse.Type;
const notificationRuleInputFields = {
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
  world: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  npcId: Schema.optionalKey(SafeInteger),
  npcIds: Schema.optionalKey(
    Schema.Array(SafeInteger).check(
      Schema.isMaxLength(5).annotate({
        expected: "a value with a length of at most 5",
      }),
    ),
  ),
  itemId: Schema.optionalKey(SafeInteger),
  itemIds: Schema.optionalKey(
    Schema.Array(SafeInteger).check(
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
  scheduledAt: Schema.optionalKey(DateTimeWithOffsetString),
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
  scheduledUntil: Schema.optionalKey(DateTimeWithOffsetString),
  scheduleTimezone: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  ),
  enabled: Schema.optionalKey(Schema.Boolean),
};

export const CreateNotificationRuleRequest = Schema.Struct({
  ...notificationRuleInputFields,
  triggerType: NotificationTriggerTypeSchema,
  targetIds: Schema.Array(SafeInteger).check(
    Schema.isMaxLength(3).annotate({
      expected: "a value with a length of at most 3",
    }),
  ),
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
export type CreateNotificationRuleRequest =
  typeof CreateNotificationRuleRequest.Type;

export const NotificationRuleResponse = Schema.Struct({
  ...notificationRuleFields,
  targets: Schema.Array(
    Schema.Struct({
      ruleId: SafeInteger,
      targetId: SafeInteger,
      createdAt: DateTimeString,
      target: Schema.Struct(notificationTargetFields(NotificationRuleMetadata)),
    }),
  ),
}).annotate({ identifier: "NotificationRuleResponseDto" });
export type NotificationRuleResponse = typeof NotificationRuleResponse.Type;

export const UpdateNotificationRuleRequest = Schema.Struct({
  ...notificationRuleInputFields,
  triggerType: Schema.optionalKey(NotificationTriggerTypeSchema),
  targetIds: Schema.optionalKey(
    Schema.Array(SafeInteger).check(
      Schema.isMaxLength(3).annotate({
        expected: "a value with a length of at most 3",
      }),
    ),
  ),
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
export type UpdateNotificationRuleRequest =
  typeof UpdateNotificationRuleRequest.Type;
const NotificationJob = Schema.Struct({
  id: Schema.String,
  ruleId: SafeInteger,
  targetId: SafeInteger,
  ownerType: NotificationOwnerTypeSchema,
  ownerId: Schema.String,
  jobKind: Schema.Literals(["SCHEDULED", "INSTANT", "TEST"]),
  scheduledFor: DateTimeString,
  status: NotificationJobStatusSchema,
  idempotencyKey: Schema.String,
  sourceEntityType: Schema.Union([Schema.String, Schema.Null]),
  sourceEntityId: Schema.Union([Schema.String, Schema.Null]),
  sourceEventId: Schema.Union([Schema.String, Schema.Null]),
  payloadSnapshot: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        title: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
        message: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
        content: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
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
        ruleId: Schema.optionalKey(Schema.Union([SafeInteger, Schema.Null])),
        ruleName: Schema.optionalKey(
          Schema.Union([Schema.String, Schema.Null]),
        ),
        triggerType: Schema.optionalKey(
          Schema.Union([NotificationTriggerTypeSchema, Schema.Null]),
        ),
        world: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
        npcId: Schema.optionalKey(Schema.Union([SafeInteger, Schema.Null])),
        npcName: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
        timerKey: Schema.optionalKey(
          Schema.Union([Schema.String, Schema.Null]),
        ),
        minSpawnTime: Schema.optionalKey(
          Schema.Union([DateTimeWithOffsetString, Schema.Null]),
        ),
        maxSpawnTime: Schema.optionalKey(
          Schema.Union([DateTimeWithOffsetString, Schema.Null]),
        ),
        scheduledFor: Schema.optionalKey(
          Schema.Union([DateTimeWithOffsetString, Schema.Null]),
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
          Schema.Union([SafeInteger, Schema.Null]),
        ),
        contentTemplate: Schema.optionalKey(
          Schema.Union([Schema.String, Schema.Null]),
        ),
        testTriggeredAt: Schema.optionalKey(
          Schema.Union([DateTimeWithOffsetString, Schema.Null]),
        ),
      }),
      [Schema.Record(Schema.String, JsonValue)],
    ),
    Schema.Null,
  ]),
  attemptCount: SafeInteger,
  lastError: Schema.Union([Schema.String, Schema.Null]),
  blockedReason: Schema.Union([Schema.String, Schema.Null]),
  providerMessageId: Schema.Union([Schema.String, Schema.Null]),
  processedAt: Schema.Union([DateTimeString, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  rule: Schema.Struct(notificationRuleFields),
  target: Schema.Struct(notificationTargetFields(NotificationJobMetadata)),
});

export const NotificationJobsResponse = Schema.Struct({
  pending: Schema.Array(NotificationJob),
  history: Schema.Array(NotificationJob),
}).annotate({ identifier: "NotificationJobsResponseDto" });
export type NotificationJobsResponse = typeof NotificationJobsResponse.Type;

export const NotificationTargetTestResponse = Schema.Struct({
  ...notificationTargetFields(NotificationTargetTestMetadata),
  testTrigger: NotificationTestQuota,
}).annotate({ identifier: "NotificationTargetWithTestTriggerResponseDto" });
export type NotificationTargetTestResponse =
  typeof NotificationTargetTestResponse.Type;

export const WatchedItemResponse = Schema.Struct({
  id: SafeInteger,
  userId: Schema.String,
  itemId: SafeInteger,
  itemName: Schema.String,
  world: Schema.String,
  enabled: Schema.Boolean,
  notificationRuleId: Schema.Union([SafeInteger, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  itemSnapshot: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        name: Schema.String,
        icon: Schema.String,
        rarity: Schema.Union([Schema.String, Schema.Null]),
        lvl: Schema.Union([SafeInteger, Schema.Null]),
        type: Schema.Union([Schema.String, Schema.Null]),
        stat: Schema.String,
      }),
      [Schema.Record(Schema.String, JsonValue)],
    ),
    Schema.Null,
  ]),
  notificationRule: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        ...notificationRuleFields,
        targets: Schema.Array(
          Schema.Struct({
            ruleId: SafeInteger,
            targetId: SafeInteger,
            createdAt: DateTimeString,
            target: Schema.Struct(
              notificationTargetFields(WatchedItemMetadata),
            ),
          }),
        ),
      }),
      [Schema.Record(Schema.String, JsonValue)],
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "WatchedItemResponseDto" });
export type WatchedItemResponse = typeof WatchedItemResponse.Type;

export const CreateWatchedItemRequest = Schema.Struct({
  itemId: SafeInteger,
  itemName: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  world: NonEmptyString.check(
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
export type CreateWatchedItemRequest = typeof CreateWatchedItemRequest.Type;

export const QuickAddWatchedItemRequest = Schema.Struct({
  itemId: SafeInteger,
  itemName: NonEmptyString.check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  world: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  guildId: NonEmptyString.check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
}).annotate({ identifier: "CreateWatchedItemQuickAddDto" });
export type QuickAddWatchedItemRequest = typeof QuickAddWatchedItemRequest.Type;

export const OrganizationNotificationParams = Schema.Struct({
  guildId: JsonValue,
});
export type OrganizationNotificationParams =
  typeof OrganizationNotificationParams.Type;

export const OrganizationNotificationTargetsResponse = Schema.Array(
  NotificationTargetResponse,
);
export type OrganizationNotificationTargetsResponse =
  typeof OrganizationNotificationTargetsResponse.Type;

export const OrganizationNotificationTargetParams = Schema.Struct({
  targetId: FiniteNumber,
  guildId: JsonValue,
});
export type OrganizationNotificationTargetParams =
  typeof OrganizationNotificationTargetParams.Type;

export const OrganizationNotificationRuleParams = Schema.Struct({
  ruleId: FiniteNumber,
  guildId: JsonValue,
});
export type OrganizationNotificationRuleParams =
  typeof OrganizationNotificationRuleParams.Type;

export const OrganizationNotificationJobParams = Schema.Struct({
  jobId: Schema.String.annotate({ examples: ["job_123"] }),
  guildId: JsonValue,
});
export type OrganizationNotificationJobParams =
  typeof OrganizationNotificationJobParams.Type;

export const UserNotificationTargetsResponse = Schema.Array(
  NotificationTargetTestResponse,
);
export type UserNotificationTargetsResponse =
  typeof UserNotificationTargetsResponse.Type;

export const NotificationTargetParams = Schema.Struct({
  targetId: FiniteNumber,
});
export type NotificationTargetParams = typeof NotificationTargetParams.Type;

export const NotificationRulesResponse = Schema.Array(NotificationRuleResponse);
export type NotificationRulesResponse = typeof NotificationRulesResponse.Type;

export const NotificationRuleParams = Schema.Struct({
  ruleId: FiniteNumber,
});
export type NotificationRuleParams = typeof NotificationRuleParams.Type;

export const WatchedItemsResponse = Schema.Array(WatchedItemResponse);
export type WatchedItemsResponse = typeof WatchedItemsResponse.Type;

export const WatchedItemParams = Schema.Struct({
  watchedItemId: FiniteNumber,
});
export type WatchedItemParams = typeof WatchedItemParams.Type;
