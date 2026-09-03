/** Transport schemas owned by the notifications HTTP module. */
import * as Schema from "effect/Schema";
import { Error as NotificationError } from "../../../notifications/error.js";
import { SuccessResponseDto_Output } from "../shared.js";
import {
  DateTimeWithOffsetString,
  DateTimeString,
  FiniteNumber,
} from "../scalars.js";

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

export type NotificationTargetResponseDto =
  typeof NotificationTargetResponseDto.Type;

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
      FiniteNumber,
      Schema.Boolean,
      Schema.Array(NotificationTargetResponseDto__schema0),
      Schema.Record(Schema.String, NotificationTargetResponseDto__schema0),
    ]),
    Schema.Null,
  ]),
  active: Schema.Boolean,
  canSend: Schema.Boolean,
  lastSyncedAt: Schema.Union([DateTimeString, Schema.Null]),
  lastDeliveryAt: Schema.Union([DateTimeString, Schema.Null]),
  lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
}).annotate({ identifier: "NotificationTargetResponseDto" });

export type CreateNotificationTargetDto =
  typeof CreateNotificationTargetDto.Type;

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

export type GuildAvailableNotificationTargetsResponseDto =
  typeof GuildAvailableNotificationTargetsResponseDto.Type;

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
      lastSyncedAt: DateTimeString,
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
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
        lastAttemptAt: Schema.Union([DateTimeString, Schema.Null]),
        lastSuccessAt: Schema.Union([DateTimeString, Schema.Null]),
        lastError: Schema.Union([Schema.String, Schema.Null]),
        createdAt: DateTimeString,
        updatedAt: DateTimeString,
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

export type UpdateNotificationTargetDto =
  typeof UpdateNotificationTargetDto.Type;

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

export type GuildNotificationRulesResponseDto =
  typeof GuildNotificationRulesResponseDto.Type;

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
      scheduledAt: Schema.Union([DateTimeString, Schema.Null]),
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
      scheduledUntil: Schema.Union([DateTimeString, Schema.Null]),
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
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
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
          createdAt: DateTimeString,
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
                FiniteNumber,
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
            lastSyncedAt: Schema.Union([DateTimeString, Schema.Null]),
            lastDeliveryAt: Schema.Union([DateTimeString, Schema.Null]),
            lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
            createdAt: DateTimeString,
            updatedAt: DateTimeString,
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
        nextAvailableAt: Schema.Union([DateTimeWithOffsetString, Schema.Null]),
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

export type CreateNotificationRuleDto = typeof CreateNotificationRuleDto.Type;

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

export type NotificationRuleResponseDto =
  typeof NotificationRuleResponseDto.Type;

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
  scheduledAt: Schema.Union([DateTimeString, Schema.Null]),
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
  scheduledUntil: Schema.Union([DateTimeString, Schema.Null]),
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
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
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
      createdAt: DateTimeString,
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
            FiniteNumber,
            Schema.Boolean,
            Schema.Array(NotificationRuleResponseDto__schema0),
            Schema.Record(Schema.String, NotificationRuleResponseDto__schema0),
          ]),
          Schema.Null,
        ]),
        active: Schema.Boolean,
        canSend: Schema.Boolean,
        lastSyncedAt: Schema.Union([DateTimeString, Schema.Null]),
        lastDeliveryAt: Schema.Union([DateTimeString, Schema.Null]),
        lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
        createdAt: DateTimeString,
        updatedAt: DateTimeString,
      }),
    }),
  ),
}).annotate({ identifier: "NotificationRuleResponseDto" });

export type UpdateNotificationRuleDto = typeof UpdateNotificationRuleDto.Type;

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

export type NotificationJobsResponseDto =
  typeof NotificationJobsResponseDto.Type;

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
      scheduledFor: DateTimeString,
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
              Schema.Union([DateTimeWithOffsetString, Schema.Null]),
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
      processedAt: Schema.Union([DateTimeString, Schema.Null]),
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
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
        scheduledAt: Schema.Union([DateTimeString, Schema.Null]),
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
        scheduledUntil: Schema.Union([DateTimeString, Schema.Null]),
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
        createdAt: DateTimeString,
        updatedAt: DateTimeString,
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
            FiniteNumber,
            Schema.Boolean,
            Schema.Array(NotificationJobsResponseDto__schema0),
            Schema.Record(Schema.String, NotificationJobsResponseDto__schema0),
          ]),
          Schema.Null,
        ]),
        active: Schema.Boolean,
        canSend: Schema.Boolean,
        lastSyncedAt: Schema.Union([DateTimeString, Schema.Null]),
        lastDeliveryAt: Schema.Union([DateTimeString, Schema.Null]),
        lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
        createdAt: DateTimeString,
        updatedAt: DateTimeString,
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
      scheduledFor: DateTimeString,
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
              Schema.Union([DateTimeWithOffsetString, Schema.Null]),
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
      processedAt: Schema.Union([DateTimeString, Schema.Null]),
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
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
        scheduledAt: Schema.Union([DateTimeString, Schema.Null]),
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
        scheduledUntil: Schema.Union([DateTimeString, Schema.Null]),
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
        createdAt: DateTimeString,
        updatedAt: DateTimeString,
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
            FiniteNumber,
            Schema.Boolean,
            Schema.Array(NotificationJobsResponseDto__schema0),
            Schema.Record(Schema.String, NotificationJobsResponseDto__schema0),
          ]),
          Schema.Null,
        ]),
        active: Schema.Boolean,
        canSend: Schema.Boolean,
        lastSyncedAt: Schema.Union([DateTimeString, Schema.Null]),
        lastDeliveryAt: Schema.Union([DateTimeString, Schema.Null]),
        lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
        createdAt: DateTimeString,
        updatedAt: DateTimeString,
      }),
    }),
  ),
}).annotate({ identifier: "NotificationJobsResponseDto" });

export type NotificationTargetWithTestTriggerResponseDto =
  typeof NotificationTargetWithTestTriggerResponseDto.Type;

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
      FiniteNumber,
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
  lastSyncedAt: Schema.Union([DateTimeString, Schema.Null]),
  lastDeliveryAt: Schema.Union([DateTimeString, Schema.Null]),
  lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
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
    nextAvailableAt: Schema.Union([DateTimeWithOffsetString, Schema.Null]),
  }),
}).annotate({ identifier: "NotificationTargetWithTestTriggerResponseDto" });

export type WatchedItemResponseDto = typeof WatchedItemResponseDto.Type;

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
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
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
        scheduledAt: Schema.Union([DateTimeString, Schema.Null]),
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
        scheduledUntil: Schema.Union([DateTimeString, Schema.Null]),
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
        createdAt: DateTimeString,
        updatedAt: DateTimeString,
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
            createdAt: DateTimeString,
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
                  FiniteNumber,
                  Schema.Boolean,
                  Schema.Array(WatchedItemResponseDto__schema0),
                  Schema.Record(Schema.String, WatchedItemResponseDto__schema0),
                ]),
                Schema.Null,
              ]),
              active: Schema.Boolean,
              canSend: Schema.Boolean,
              lastSyncedAt: Schema.Union([DateTimeString, Schema.Null]),
              lastDeliveryAt: Schema.Union([DateTimeString, Schema.Null]),
              lastDeliveryError: Schema.Union([Schema.String, Schema.Null]),
              createdAt: DateTimeString,
              updatedAt: DateTimeString,
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

export type CreateWatchedItemDto = typeof CreateWatchedItemDto.Type;

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

export type CreateWatchedItemQuickAddDto =
  typeof CreateWatchedItemQuickAddDto.Type;

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
          FiniteNumber,
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
          FiniteNumber,
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
          FiniteNumber,
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
          FiniteNumber,
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
            FiniteNumber,
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
          FiniteNumber,
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

export type NotificationsGuildControllerGetGuildTargetsPathParams =
  typeof NotificationsGuildControllerGetGuildTargetsPathParams.Type;

export const NotificationsGuildControllerGetGuildTargetsPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerGetGuildTargets200 =
  typeof NotificationsGuildControllerGetGuildTargets200.Type;

export const NotificationsGuildControllerGetGuildTargets200 = Schema.Array(
  NotificationTargetResponseDto,
);

export type NotificationsGuildControllerCreateGuildTargetPathParams =
  typeof NotificationsGuildControllerCreateGuildTargetPathParams.Type;

export const NotificationsGuildControllerCreateGuildTargetPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerCreateGuildTargetRequestJson =
  typeof NotificationsGuildControllerCreateGuildTargetRequestJson.Type;

export const NotificationsGuildControllerCreateGuildTargetRequestJson =
  CreateNotificationTargetDto;

export type NotificationsGuildControllerCreateGuildTarget201 =
  typeof NotificationsGuildControllerCreateGuildTarget201.Type;

export const NotificationsGuildControllerCreateGuildTarget201 =
  NotificationTargetResponseDto;

export type NotificationsGuildControllerGetAvailableGuildTargetsPathParams =
  typeof NotificationsGuildControllerGetAvailableGuildTargetsPathParams.Type;

export const NotificationsGuildControllerGetAvailableGuildTargetsPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerGetAvailableGuildTargets200 =
  typeof NotificationsGuildControllerGetAvailableGuildTargets200.Type;

export const NotificationsGuildControllerGetAvailableGuildTargets200 =
  GuildAvailableNotificationTargetsResponseDto;

export type NotificationsGuildControllerDeleteGuildTargetPathParams =
  typeof NotificationsGuildControllerDeleteGuildTargetPathParams.Type;

export const NotificationsGuildControllerDeleteGuildTargetPathParams =
  Schema.Struct({
    targetId: FiniteNumber,
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerDeleteGuildTarget200 =
  typeof NotificationsGuildControllerDeleteGuildTarget200.Type;

export const NotificationsGuildControllerDeleteGuildTarget200 =
  SuccessResponseDto_Output;

export type NotificationsGuildControllerUpdateGuildTargetPathParams =
  typeof NotificationsGuildControllerUpdateGuildTargetPathParams.Type;

export const NotificationsGuildControllerUpdateGuildTargetPathParams =
  Schema.Struct({
    targetId: FiniteNumber,
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerUpdateGuildTargetRequestJson =
  typeof NotificationsGuildControllerUpdateGuildTargetRequestJson.Type;

export const NotificationsGuildControllerUpdateGuildTargetRequestJson =
  UpdateNotificationTargetDto;

export type NotificationsGuildControllerUpdateGuildTarget200 =
  typeof NotificationsGuildControllerUpdateGuildTarget200.Type;

export const NotificationsGuildControllerUpdateGuildTarget200 =
  NotificationTargetResponseDto;

export type NotificationsGuildControllerGetGuildRulesPathParams =
  typeof NotificationsGuildControllerGetGuildRulesPathParams.Type;

export const NotificationsGuildControllerGetGuildRulesPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerGetGuildRules200 =
  typeof NotificationsGuildControllerGetGuildRules200.Type;

export const NotificationsGuildControllerGetGuildRules200 =
  GuildNotificationRulesResponseDto;

export type NotificationsGuildControllerCreateGuildRulePathParams =
  typeof NotificationsGuildControllerCreateGuildRulePathParams.Type;

export const NotificationsGuildControllerCreateGuildRulePathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type NotificationsGuildControllerCreateGuildRuleRequestJson =
  typeof NotificationsGuildControllerCreateGuildRuleRequestJson.Type;

export const NotificationsGuildControllerCreateGuildRuleRequestJson =
  CreateNotificationRuleDto;

export type NotificationsGuildControllerCreateGuildRule201 =
  typeof NotificationsGuildControllerCreateGuildRule201.Type;

export const NotificationsGuildControllerCreateGuildRule201 =
  NotificationRuleResponseDto;

export type NotificationsGuildControllerDeleteGuildRulePathParams =
  typeof NotificationsGuildControllerDeleteGuildRulePathParams.Type;

export const NotificationsGuildControllerDeleteGuildRulePathParams =
  Schema.Struct({
    ruleId: FiniteNumber,
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerDeleteGuildRule200 =
  typeof NotificationsGuildControllerDeleteGuildRule200.Type;

export const NotificationsGuildControllerDeleteGuildRule200 =
  SuccessResponseDto_Output;

export type NotificationsGuildControllerUpdateGuildRulePathParams =
  typeof NotificationsGuildControllerUpdateGuildRulePathParams.Type;

export const NotificationsGuildControllerUpdateGuildRulePathParams =
  Schema.Struct({
    ruleId: FiniteNumber,
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerUpdateGuildRuleRequestJson =
  typeof NotificationsGuildControllerUpdateGuildRuleRequestJson.Type;

export const NotificationsGuildControllerUpdateGuildRuleRequestJson =
  UpdateNotificationRuleDto;

export type NotificationsGuildControllerUpdateGuildRule200 =
  typeof NotificationsGuildControllerUpdateGuildRule200.Type;

export const NotificationsGuildControllerUpdateGuildRule200 =
  NotificationRuleResponseDto;

export type NotificationsGuildControllerRebuildGuildRuleJobsPathParams =
  typeof NotificationsGuildControllerRebuildGuildRuleJobsPathParams.Type;

export const NotificationsGuildControllerRebuildGuildRuleJobsPathParams =
  Schema.Struct({
    ruleId: FiniteNumber,
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerRebuildGuildRuleJobs201 =
  typeof NotificationsGuildControllerRebuildGuildRuleJobs201.Type;

export const NotificationsGuildControllerRebuildGuildRuleJobs201 =
  SuccessResponseDto_Output;

export type NotificationsGuildControllerTriggerGuildRuleTestPathParams =
  typeof NotificationsGuildControllerTriggerGuildRuleTestPathParams.Type;

export const NotificationsGuildControllerTriggerGuildRuleTestPathParams =
  Schema.Struct({
    ruleId: FiniteNumber,
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerTriggerGuildRuleTest201 =
  typeof NotificationsGuildControllerTriggerGuildRuleTest201.Type;

export const NotificationsGuildControllerTriggerGuildRuleTest201 =
  SuccessResponseDto_Output;

export type NotificationsGuildControllerGetGuildJobsPathParams =
  typeof NotificationsGuildControllerGetGuildJobsPathParams.Type;

export const NotificationsGuildControllerGetGuildJobsPathParams = Schema.Struct(
  { guildId: Schema.Json.annotate({ expected: "JSON value" }) },
);

export type NotificationsGuildControllerGetGuildJobs200 =
  typeof NotificationsGuildControllerGetGuildJobs200.Type;

export const NotificationsGuildControllerGetGuildJobs200 =
  NotificationJobsResponseDto;

export type NotificationsGuildControllerCancelGuildJobPathParams =
  typeof NotificationsGuildControllerCancelGuildJobPathParams.Type;

export const NotificationsGuildControllerCancelGuildJobPathParams =
  Schema.Struct({
    jobId: Schema.String.annotate({ examples: ["job_123"] }),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type NotificationsGuildControllerCancelGuildJob200 =
  typeof NotificationsGuildControllerCancelGuildJob200.Type;

export const NotificationsGuildControllerCancelGuildJob200 =
  SuccessResponseDto_Output;

export type NotificationsUserControllerGetUserTargets200 =
  typeof NotificationsUserControllerGetUserTargets200.Type;

export const NotificationsUserControllerGetUserTargets200 = Schema.Array(
  NotificationTargetWithTestTriggerResponseDto,
);

export type NotificationsUserControllerCreateUserTargetRequestJson =
  typeof NotificationsUserControllerCreateUserTargetRequestJson.Type;

export const NotificationsUserControllerCreateUserTargetRequestJson =
  CreateNotificationTargetDto;

export type NotificationsUserControllerCreateUserTarget201 =
  typeof NotificationsUserControllerCreateUserTarget201.Type;

export const NotificationsUserControllerCreateUserTarget201 =
  NotificationTargetResponseDto;

export type NotificationsUserControllerDeleteUserTargetPathParams =
  typeof NotificationsUserControllerDeleteUserTargetPathParams.Type;

export const NotificationsUserControllerDeleteUserTargetPathParams =
  Schema.Struct({
    targetId: FiniteNumber,
  });

export type NotificationsUserControllerDeleteUserTarget200 =
  typeof NotificationsUserControllerDeleteUserTarget200.Type;

export const NotificationsUserControllerDeleteUserTarget200 =
  SuccessResponseDto_Output;

export type NotificationsUserControllerUpdateUserTargetPathParams =
  typeof NotificationsUserControllerUpdateUserTargetPathParams.Type;

export const NotificationsUserControllerUpdateUserTargetPathParams =
  Schema.Struct({
    targetId: FiniteNumber,
  });

export type NotificationsUserControllerUpdateUserTargetRequestJson =
  typeof NotificationsUserControllerUpdateUserTargetRequestJson.Type;

export const NotificationsUserControllerUpdateUserTargetRequestJson =
  UpdateNotificationTargetDto;

export type NotificationsUserControllerUpdateUserTarget200 =
  typeof NotificationsUserControllerUpdateUserTarget200.Type;

export const NotificationsUserControllerUpdateUserTarget200 =
  NotificationTargetResponseDto;

export type NotificationsUserControllerTriggerUserTargetTestPathParams =
  typeof NotificationsUserControllerTriggerUserTargetTestPathParams.Type;

export const NotificationsUserControllerTriggerUserTargetTestPathParams =
  Schema.Struct({
    targetId: FiniteNumber,
  });

export type NotificationsUserControllerTriggerUserTargetTest201 =
  typeof NotificationsUserControllerTriggerUserTargetTest201.Type;

export const NotificationsUserControllerTriggerUserTargetTest201 =
  SuccessResponseDto_Output;

export type NotificationsUserControllerGetUserRules200 =
  typeof NotificationsUserControllerGetUserRules200.Type;

export const NotificationsUserControllerGetUserRules200 = Schema.Array(
  NotificationRuleResponseDto,
);

export type NotificationsUserControllerCreateUserRuleRequestJson =
  typeof NotificationsUserControllerCreateUserRuleRequestJson.Type;

export const NotificationsUserControllerCreateUserRuleRequestJson =
  CreateNotificationRuleDto;

export type NotificationsUserControllerCreateUserRule201 =
  typeof NotificationsUserControllerCreateUserRule201.Type;

export const NotificationsUserControllerCreateUserRule201 =
  NotificationRuleResponseDto;

export type NotificationsUserControllerDeleteUserRulePathParams =
  typeof NotificationsUserControllerDeleteUserRulePathParams.Type;

export const NotificationsUserControllerDeleteUserRulePathParams =
  Schema.Struct({
    ruleId: FiniteNumber,
  });

export type NotificationsUserControllerDeleteUserRule200 =
  typeof NotificationsUserControllerDeleteUserRule200.Type;

export const NotificationsUserControllerDeleteUserRule200 =
  SuccessResponseDto_Output;

export type NotificationsUserControllerUpdateUserRulePathParams =
  typeof NotificationsUserControllerUpdateUserRulePathParams.Type;

export const NotificationsUserControllerUpdateUserRulePathParams =
  Schema.Struct({
    ruleId: FiniteNumber,
  });

export type NotificationsUserControllerUpdateUserRuleRequestJson =
  typeof NotificationsUserControllerUpdateUserRuleRequestJson.Type;

export const NotificationsUserControllerUpdateUserRuleRequestJson =
  UpdateNotificationRuleDto;

export type NotificationsUserControllerUpdateUserRule200 =
  typeof NotificationsUserControllerUpdateUserRule200.Type;

export const NotificationsUserControllerUpdateUserRule200 =
  NotificationRuleResponseDto;

export type NotificationsUserControllerGetUserJobs200 =
  typeof NotificationsUserControllerGetUserJobs200.Type;

export const NotificationsUserControllerGetUserJobs200 =
  NotificationJobsResponseDto;

export type NotificationsUserControllerGetWatchedItems200 =
  typeof NotificationsUserControllerGetWatchedItems200.Type;

export const NotificationsUserControllerGetWatchedItems200 = Schema.Array(
  WatchedItemResponseDto,
);

export type NotificationsUserControllerCreateWatchedItemRequestJson =
  typeof NotificationsUserControllerCreateWatchedItemRequestJson.Type;

export const NotificationsUserControllerCreateWatchedItemRequestJson =
  CreateWatchedItemDto;

export type NotificationsUserControllerCreateWatchedItem201 =
  typeof NotificationsUserControllerCreateWatchedItem201.Type;

export const NotificationsUserControllerCreateWatchedItem201 =
  WatchedItemResponseDto;

export type NotificationsUserControllerQuickAddWatchedItemRequestJson =
  typeof NotificationsUserControllerQuickAddWatchedItemRequestJson.Type;

export const NotificationsUserControllerQuickAddWatchedItemRequestJson =
  CreateWatchedItemQuickAddDto;

export type NotificationsUserControllerQuickAddWatchedItem201 =
  typeof NotificationsUserControllerQuickAddWatchedItem201.Type;

export const NotificationsUserControllerQuickAddWatchedItem201 =
  WatchedItemResponseDto;

export type NotificationsUserControllerDeleteWatchedItemPathParams =
  typeof NotificationsUserControllerDeleteWatchedItemPathParams.Type;

export const NotificationsUserControllerDeleteWatchedItemPathParams =
  Schema.Struct({
    watchedItemId: FiniteNumber,
  });

export type NotificationsUserControllerDeleteWatchedItem200 =
  typeof NotificationsUserControllerDeleteWatchedItem200.Type;

export const NotificationsUserControllerDeleteWatchedItem200 =
  SuccessResponseDto_Output;
