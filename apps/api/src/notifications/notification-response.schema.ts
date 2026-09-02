import { Schema } from "effect";
import {
  NotificationJobKind,
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationProvider,
  NotificationScheduleAnchor,
  NotificationScheduleIntervalType,
  NotificationScheduleStrategy,
  NotificationTargetType,
  NotificationTriggerType,
} from "./notification-enums.js";
import {
  isoDatetimeCodec,
  jsonValueSchema,
  nullableIsoDatetimeCodec,
} from "#src/shared/schema/response-codecs";
import {
  DiscordGuildChannelSnapshotResponse,
  DiscordGuildSyncStateResponse,
} from "#src/shared/schema/discord-guild-sync";

const literals = <A extends string>(values: ReadonlyArray<A>) =>
  Schema.Literals(values);
const optionalNullable = <S extends Schema.Top>(schema: S) =>
  Schema.optionalKey(Schema.NullOr(schema));

export const NotificationTestTriggerUsageResponse = Schema.Struct({
  limit: Schema.Int,
  used: Schema.Int,
  remaining: Schema.Int,
  windowSeconds: Schema.Int,
  nextAvailableAt: Schema.NullOr(Schema.String),
});

export const NotificationFiltersResponse = Schema.Struct({
  guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
  world: Schema.optionalKey(Schema.String),
  npcId: optionalNullable(Schema.Int),
  npcIds: Schema.optionalKey(Schema.Array(Schema.Int)),
  itemId: optionalNullable(Schema.Int),
  itemIds: Schema.optionalKey(Schema.Array(Schema.Int)),
});

export const NotificationTargetResponse = Schema.Struct({
  id: Schema.Int,
  ownerType: literals(Object.values(NotificationOwnerType)),
  ownerId: Schema.String,
  provider: literals(Object.values(NotificationProvider)),
  targetType: literals(Object.values(NotificationTargetType)),
  externalId: Schema.String,
  displayName: Schema.NullOr(Schema.String),
  guildName: Schema.NullOr(Schema.String),
  metadata: Schema.NullOr(jsonValueSchema),
  active: Schema.Boolean,
  canSend: Schema.Boolean,
  lastSyncedAt: nullableIsoDatetimeCodec,
  lastDeliveryAt: nullableIsoDatetimeCodec,
  lastDeliveryError: Schema.NullOr(Schema.String),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export const NotificationTargetWithTestTriggerResponse = Schema.Struct({
  ...NotificationTargetResponse.fields,
  testTrigger: NotificationTestTriggerUsageResponse,
});

const NotificationRuleTargetResponse = Schema.Struct({
  ruleId: Schema.Int,
  targetId: Schema.Int,
  createdAt: isoDatetimeCodec,
  target: NotificationTargetResponse,
});

export const NotificationRuleSummaryResponse = Schema.Struct({
  id: Schema.Int,
  ownerType: literals(Object.values(NotificationOwnerType)),
  ownerId: Schema.String,
  triggerType: literals(Object.values(NotificationTriggerType)),
  guildId: Schema.NullOr(Schema.String),
  world: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
  filters: Schema.NullOr(NotificationFiltersResponse),
  contentTemplate: Schema.NullOr(Schema.String),
  scheduleStrategy: Schema.NullOr(
    literals(Object.values(NotificationScheduleStrategy)),
  ),
  scheduleAnchor: Schema.NullOr(
    literals(Object.values(NotificationScheduleAnchor)),
  ),
  scheduleOffsetMinutes: Schema.NullOr(Schema.Int),
  scheduledAt: nullableIsoDatetimeCodec,
  scheduleIntervalType: Schema.NullOr(
    literals(Object.values(NotificationScheduleIntervalType)),
  ),
  scheduleIntervalValue: Schema.NullOr(Schema.Int),
  scheduleWeekday: Schema.NullOr(Schema.Int),
  scheduleTimeOfDay: Schema.NullOr(Schema.String),
  scheduledUntil: nullableIsoDatetimeCodec,
  scheduleTimezone: Schema.NullOr(Schema.String),
  enabled: Schema.Boolean,
  dedupeWindowSeconds: Schema.Int,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export const NotificationRuleResponse = Schema.Struct({
  ...NotificationRuleSummaryResponse.fields,
  targets: Schema.Array(NotificationRuleTargetResponse),
});

const NotificationRuleWithTestTriggerResponse = Schema.Struct({
  ...NotificationRuleResponse.fields,
  testTrigger: NotificationTestTriggerUsageResponse,
});

const NotificationRuleLimitsResponse = Schema.Struct({
  ruleLimit: Schema.Int,
  ruleCount: Schema.Int,
  maxNpcsPerRule: Schema.Int,
  testTriggerLimit: Schema.Int,
  testTriggerWindowSeconds: Schema.Int,
});

export const GuildNotificationRulesResponse = Schema.Struct({
  items: Schema.Array(NotificationRuleWithTestTriggerResponse),
  limits: NotificationRuleLimitsResponse,
});

const NotificationAllowedMentionsResponse = Schema.Struct({
  parse: Schema.optionalKey(
    Schema.Array(Schema.Literals(["roles", "users", "everyone"])),
  ),
  roles: Schema.optionalKey(Schema.Array(Schema.String)),
  users: Schema.optionalKey(Schema.Array(Schema.String)),
  repliedUser: Schema.optionalKey(Schema.Boolean),
});

export const NotificationJobPayloadSnapshotResponse = Schema.NullOr(
  Schema.Struct({
    title: optionalNullable(Schema.String),
    message: optionalNullable(Schema.String),
    content: optionalNullable(Schema.String),
    allowedMentions: optionalNullable(NotificationAllowedMentionsResponse),
    ruleId: optionalNullable(Schema.Int),
    ruleName: optionalNullable(Schema.String),
    triggerType: optionalNullable(
      literals(Object.values(NotificationTriggerType)),
    ),
    world: optionalNullable(Schema.String),
    npcId: optionalNullable(Schema.Int),
    npcName: optionalNullable(Schema.String),
    timerKey: optionalNullable(Schema.String),
    minSpawnTime: optionalNullable(Schema.String),
    maxSpawnTime: optionalNullable(Schema.String),
    scheduledFor: optionalNullable(Schema.String),
    scheduleStrategy: optionalNullable(
      literals(Object.values(NotificationScheduleStrategy)),
    ),
    scheduleAnchor: optionalNullable(
      literals(Object.values(NotificationScheduleAnchor)),
    ),
    scheduleOffsetMinutes: optionalNullable(Schema.Int),
    contentTemplate: optionalNullable(Schema.String),
    testTriggeredAt: optionalNullable(Schema.String),
  }),
);

const NotificationJobResponse = Schema.Struct({
  id: Schema.String,
  ruleId: Schema.Int,
  targetId: Schema.Int,
  ownerType: literals(Object.values(NotificationOwnerType)),
  ownerId: Schema.String,
  jobKind: literals(Object.values(NotificationJobKind)),
  scheduledFor: isoDatetimeCodec,
  status: literals(Object.values(NotificationJobStatus)),
  idempotencyKey: Schema.String,
  sourceEntityType: Schema.NullOr(Schema.String),
  sourceEntityId: Schema.NullOr(Schema.String),
  sourceEventId: Schema.NullOr(Schema.String),
  payloadSnapshot: NotificationJobPayloadSnapshotResponse,
  attemptCount: Schema.Int,
  lastError: Schema.NullOr(Schema.String),
  blockedReason: Schema.NullOr(Schema.String),
  providerMessageId: Schema.NullOr(Schema.String),
  processedAt: nullableIsoDatetimeCodec,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  rule: NotificationRuleSummaryResponse,
  target: NotificationTargetResponse,
});

export const NotificationJobsResponse = Schema.Struct({
  pending: Schema.Array(NotificationJobResponse),
  history: Schema.Array(NotificationJobResponse),
});

export const GuildAvailableNotificationTargetsResponse = Schema.Struct({
  channels: Schema.Array(DiscordGuildChannelSnapshotResponse),
  syncState: Schema.NullOr(DiscordGuildSyncStateResponse),
});

export const WatchedItemSnapshotResponse = Schema.Struct({
  name: Schema.String,
  icon: Schema.String,
  rarity: Schema.NullOr(Schema.String),
  lvl: Schema.NullOr(Schema.Int),
  type: Schema.NullOr(Schema.String),
  stat: Schema.String,
});

export const WatchedItemResponse = Schema.Struct({
  id: Schema.Int,
  userId: Schema.String,
  itemId: Schema.Int,
  itemName: Schema.String,
  world: Schema.String,
  enabled: Schema.Boolean,
  notificationRuleId: Schema.NullOr(Schema.Int),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  itemSnapshot: Schema.NullOr(WatchedItemSnapshotResponse),
  notificationRule: Schema.NullOr(NotificationRuleResponse),
});
