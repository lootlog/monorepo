import { createZodDto } from "nestjs-zod";
import { z } from "zod";
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
} from "src/db/domain";
import {
  isoDatetimeCodec,
  jsonValueSchema,
  nullableIsoDatetimeCodec,
} from "src/shared/dto/zod-response-codecs";
import {
  DiscordGuildChannelSnapshotResponseDto,
  DiscordGuildSyncStateResponseDto,
} from "src/shared/dto/discord-guild-sync-response.dto";

const NotificationTestTriggerUsageResponseSchema = z.object({
  limit: z.number().int(),
  used: z.number().int(),
  remaining: z.number().int(),
  windowSeconds: z.number().int(),
  nextAvailableAt: z.string().datetime({ offset: true }).nullable(),
});

export class NotificationTestTriggerUsageResponseDto extends createZodDto(
  NotificationTestTriggerUsageResponseSchema,
) {}

const NotificationFiltersResponseSchema = z.object({
  guildIds: z.array(z.string()).optional(),
  world: z.string().optional(),
  npcId: z.number().int().nullable().optional(),
  npcIds: z.array(z.number().int()).optional(),
  itemId: z.number().int().nullable().optional(),
  itemIds: z.array(z.number().int()).optional(),
});

export class NotificationFiltersResponseDto extends createZodDto(
  NotificationFiltersResponseSchema,
) {}

const NotificationTargetResponseSchema = z.object({
  id: z.number().int(),
  ownerType: z.nativeEnum(NotificationOwnerType),
  ownerId: z.string(),
  provider: z.nativeEnum(NotificationProvider),
  targetType: z.nativeEnum(NotificationTargetType),
  externalId: z.string(),
  displayName: z.string().nullable(),
  guildName: z.string().nullable(),
  metadata: jsonValueSchema.nullable(),
  active: z.boolean(),
  canSend: z.boolean(),
  lastSyncedAt: nullableIsoDatetimeCodec,
  lastDeliveryAt: nullableIsoDatetimeCodec,
  lastDeliveryError: z.string().nullable(),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class NotificationTargetResponseDto extends createZodDto(
  NotificationTargetResponseSchema,
  {
    codec: true,
  },
) {}

const NotificationTargetWithTestTriggerResponseSchema =
  NotificationTargetResponseSchema.extend({
    testTrigger: NotificationTestTriggerUsageResponseSchema,
  });

export class NotificationTargetWithTestTriggerResponseDto extends createZodDto(
  NotificationTargetWithTestTriggerResponseSchema,
  {
    codec: true,
  },
) {}

const NotificationRuleTargetResponseSchema = z.object({
  ruleId: z.number().int(),
  targetId: z.number().int(),
  createdAt: isoDatetimeCodec,
  target: NotificationTargetResponseSchema,
});

export class NotificationRuleTargetResponseDto extends createZodDto(
  NotificationRuleTargetResponseSchema,
  {
    codec: true,
  },
) {}

const NotificationRuleSummaryResponseSchema = z.object({
  id: z.number().int(),
  ownerType: z.nativeEnum(NotificationOwnerType),
  ownerId: z.string(),
  triggerType: z.nativeEnum(NotificationTriggerType),
  guildId: z.string().nullable(),
  world: z.string().nullable(),
  name: z.string().nullable(),
  filters: NotificationFiltersResponseSchema.nullable(),
  contentTemplate: z.string().nullable(),
  scheduleStrategy: z.nativeEnum(NotificationScheduleStrategy).nullable(),
  scheduleAnchor: z.nativeEnum(NotificationScheduleAnchor).nullable(),
  scheduleOffsetMinutes: z.number().int().nullable(),
  scheduledAt: nullableIsoDatetimeCodec,
  scheduleIntervalType: z
    .nativeEnum(NotificationScheduleIntervalType)
    .nullable(),
  scheduleIntervalValue: z.number().int().nullable(),
  scheduleWeekday: z.number().int().nullable(),
  scheduleTimeOfDay: z.string().nullable(),
  scheduledUntil: nullableIsoDatetimeCodec,
  scheduleTimezone: z.string().nullable(),
  enabled: z.boolean(),
  dedupeWindowSeconds: z.number().int(),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class NotificationRuleSummaryResponseDto extends createZodDto(
  NotificationRuleSummaryResponseSchema,
  {
    codec: true,
  },
) {}

const NotificationRuleResponseSchema =
  NotificationRuleSummaryResponseSchema.extend({
    targets: z.array(NotificationRuleTargetResponseSchema),
  });

export class NotificationRuleResponseDto extends createZodDto(
  NotificationRuleResponseSchema,
  {
    codec: true,
  },
) {}

const NotificationRuleWithTestTriggerResponseSchema =
  NotificationRuleResponseSchema.extend({
    testTrigger: NotificationTestTriggerUsageResponseSchema,
  });

export class NotificationRuleWithTestTriggerResponseDto extends createZodDto(
  NotificationRuleWithTestTriggerResponseSchema,
  {
    codec: true,
  },
) {}

const NotificationRuleLimitsResponseSchema = z.object({
  ruleLimit: z.number().int(),
  ruleCount: z.number().int(),
  maxNpcsPerRule: z.number().int(),
  testTriggerLimit: z.number().int(),
  testTriggerWindowSeconds: z.number().int(),
});

export class NotificationRuleLimitsResponseDto extends createZodDto(
  NotificationRuleLimitsResponseSchema,
) {}

const GuildNotificationRulesResponseSchema = z.object({
  items: z.array(NotificationRuleWithTestTriggerResponseSchema),
  limits: NotificationRuleLimitsResponseSchema,
});

export class GuildNotificationRulesResponseDto extends createZodDto(
  GuildNotificationRulesResponseSchema,
  {
    codec: true,
  },
) {}

const NotificationAllowedMentionsResponseSchema = z
  .object({
    parse: z.enum(["roles", "users", "everyone"]).array().optional(),
    roles: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
    repliedUser: z.boolean().optional(),
  })
  .meta({ id: "NotificationAllowedMentionsResponseDto" });

export class NotificationAllowedMentionsResponseDto extends createZodDto(
  NotificationAllowedMentionsResponseSchema,
) {}

const NotificationJobPayloadSnapshotResponseSchema = z
  .object({
    title: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    allowedMentions:
      NotificationAllowedMentionsResponseSchema.nullable().optional(),
    ruleId: z.number().int().nullable().optional(),
    ruleName: z.string().nullable().optional(),
    triggerType: z.nativeEnum(NotificationTriggerType).nullable().optional(),
    world: z.string().nullable().optional(),
    npcId: z.number().int().nullable().optional(),
    npcName: z.string().nullable().optional(),
    timerKey: z.string().nullable().optional(),
    minSpawnTime: z.string().datetime({ offset: true }).nullable().optional(),
    maxSpawnTime: z.string().datetime({ offset: true }).nullable().optional(),
    scheduledFor: z.string().datetime({ offset: true }).nullable().optional(),
    scheduleStrategy: z
      .nativeEnum(NotificationScheduleStrategy)
      .nullable()
      .optional(),
    scheduleAnchor: z
      .nativeEnum(NotificationScheduleAnchor)
      .nullable()
      .optional(),
    scheduleOffsetMinutes: z.number().int().nullable().optional(),
    contentTemplate: z.string().nullable().optional(),
    testTriggeredAt: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
  })
  .nullable()
  .meta({ id: "NotificationJobPayloadSnapshotResponseDto" });

export class NotificationJobPayloadSnapshotResponseDto extends createZodDto(
  NotificationJobPayloadSnapshotResponseSchema,
) {}

const NotificationJobResponseSchema = z.object({
  id: z.string(),
  ruleId: z.number().int(),
  targetId: z.number().int(),
  ownerType: z.nativeEnum(NotificationOwnerType),
  ownerId: z.string(),
  jobKind: z.nativeEnum(NotificationJobKind),
  scheduledFor: isoDatetimeCodec,
  status: z.nativeEnum(NotificationJobStatus),
  idempotencyKey: z.string(),
  sourceEntityType: z.string().nullable(),
  sourceEntityId: z.string().nullable(),
  sourceEventId: z.string().nullable(),
  payloadSnapshot: NotificationJobPayloadSnapshotResponseSchema,
  attemptCount: z.number().int(),
  lastError: z.string().nullable(),
  blockedReason: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  processedAt: nullableIsoDatetimeCodec,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  rule: NotificationRuleSummaryResponseSchema,
  target: NotificationTargetResponseSchema,
});

export class NotificationJobResponseDto extends createZodDto(
  NotificationJobResponseSchema,
  {
    codec: true,
  },
) {}

const NotificationJobsResponseSchema = z.object({
  pending: z.array(NotificationJobResponseSchema),
  history: z.array(NotificationJobResponseSchema),
});

export class NotificationJobsResponseDto extends createZodDto(
  NotificationJobsResponseSchema,
  {
    codec: true,
  },
) {}

const GuildAvailableNotificationTargetsResponseSchema = z.object({
  channels: z.array(DiscordGuildChannelSnapshotResponseDto.schema),
  syncState: DiscordGuildSyncStateResponseDto.schema.nullable(),
});

export class GuildAvailableNotificationTargetsResponseDto extends createZodDto(
  GuildAvailableNotificationTargetsResponseSchema,
  {
    codec: true,
  },
) {}

const WatchedItemSnapshotResponseSchema = z.object({
  name: z.string(),
  icon: z.string(),
  rarity: z.string().nullable(),
  lvl: z.number().int().nullable(),
  type: z.string().nullable(),
  stat: z.string(),
});

export class WatchedItemSnapshotResponseDto extends createZodDto(
  WatchedItemSnapshotResponseSchema,
) {}

const WatchedItemResponseSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  itemId: z.number().int(),
  itemName: z.string(),
  world: z.string(),
  enabled: z.boolean(),
  notificationRuleId: z.number().int().nullable(),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
  itemSnapshot: WatchedItemSnapshotResponseSchema.nullable(),
  notificationRule: NotificationRuleResponseSchema.nullable(),
});

export class WatchedItemResponseDto extends createZodDto(
  WatchedItemResponseSchema,
  {
    codec: true,
  },
) {}
