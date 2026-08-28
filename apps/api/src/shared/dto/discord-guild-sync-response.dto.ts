import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { DiscordGuildSyncStatus } from "src/db/domain";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "src/shared/dto/zod-response-codecs";

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
