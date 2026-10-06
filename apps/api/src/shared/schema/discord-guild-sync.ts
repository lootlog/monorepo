import { IsoDateTime } from "@lootlog/schema/primitives";
import {
  discordGuildChannelFields,
  discordPermissionFields,
  DiscordGuildSyncStatus,
} from "@lootlog/schema/discord";
import { Schema } from "effect";
import { nullableIsoDatetimeCodec } from "./response-codecs.js";

export const DiscordGuildChannelSnapshotResponse = Schema.Struct({
  id: Schema.Int,
  ...discordGuildChannelFields,
  lastSyncedAt: IsoDateTime,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

export type DiscordGuildChannelSnapshotResponse =
  typeof DiscordGuildChannelSnapshotResponse.Type;

export const DiscordGuildSyncStateResponse = Schema.Struct({
  guildId: Schema.String,
  status: DiscordGuildSyncStatus,
  ...discordPermissionFields,
  channelCount: Schema.Int,
  selectableChannelCount: Schema.Int,
  lastAttemptAt: nullableIsoDatetimeCodec,
  lastSuccessAt: nullableIsoDatetimeCodec,
  lastError: Schema.NullOr(Schema.String),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

export type DiscordGuildSyncStateResponse =
  typeof DiscordGuildSyncStateResponse.Type;
