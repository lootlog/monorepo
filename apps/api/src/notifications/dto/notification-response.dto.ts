import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  DiscordGuildSyncStatus,
  NotificationJobKind,
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationProvider,
  NotificationScheduleAnchor,
  NotificationScheduleIntervalType,
  NotificationScheduleStrategy,
  NotificationTargetType,
  NotificationTriggerType,
} from "src/generated/prisma/client";
import {
  isoDatetimeCodec,
  jsonValueSchema,
  nullableIsoDatetimeCodec,
} from "src/shared/dto/zod-response-codecs";

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
  payloadSnapshot: jsonValueSchema,
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

const DiscordGuildChannelSnapshotResponseSchema = z.object({
  id: z.number().int(),
  guildId: z.string(),
  channelId: z.string(),
  name: z.string(),
  channelType: z.string(),
  parentId: z.string().nullable(),
  position: z.number().int(),
  active: z.boolean(),
  canView: z.boolean(),
  canSend: z.boolean(),
  hasRequiredPermissions: z.boolean(),
  requiredPermissions: z.array(z.string()),
  grantedPermissions: z.array(z.string()),
  missingPermissions: z.array(z.string()),
  lastSyncedAt: isoDatetimeCodec,
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class DiscordGuildChannelSnapshotResponseDto extends createZodDto(
  DiscordGuildChannelSnapshotResponseSchema,
  {
    codec: true,
  },
) {}

const DiscordGuildSyncStateResponseSchema = z.object({
  guildId: z.string(),
  status: z.nativeEnum(DiscordGuildSyncStatus),
  hasRequiredPermissions: z.boolean(),
  requiredPermissions: z.array(z.string()),
  grantedPermissions: z.array(z.string()),
  missingPermissions: z.array(z.string()),
  channelCount: z.number().int(),
  selectableChannelCount: z.number().int(),
  lastAttemptAt: nullableIsoDatetimeCodec,
  lastSuccessAt: nullableIsoDatetimeCodec,
  lastError: z.string().nullable(),
  createdAt: isoDatetimeCodec,
  updatedAt: isoDatetimeCodec,
});

export class DiscordGuildSyncStateResponseDto extends createZodDto(
  DiscordGuildSyncStateResponseSchema,
  {
    codec: true,
  },
) {}

const GuildAvailableNotificationTargetsResponseSchema = z.object({
  channels: z.array(DiscordGuildChannelSnapshotResponseSchema),
  syncState: DiscordGuildSyncStateResponseSchema.nullable(),
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
