import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "#src/shared/dto/zod-response-codecs";

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

export class DiscordGuildChannelSnapshotResponseDto extends createSchemaClass(
  DiscordGuildChannelSnapshotResponseSchema,
  {
    codec: true,
  },
) {}

const DiscordGuildSyncStateResponseSchema = z.object({
  guildId: z.string(),
  status: z.enum(["SYNCED", "SYNCING", "FAILED", "STALE", "NOT_FOUND"]),
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

export class DiscordGuildSyncStateResponseDto extends createSchemaClass(
  DiscordGuildSyncStateResponseSchema,
  {
    codec: true,
  },
) {}
