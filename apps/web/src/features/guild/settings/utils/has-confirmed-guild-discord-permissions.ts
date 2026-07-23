import type { DiscordGuildSyncStateResponseDto } from "@lootlog/api-client/models/main/discord-guild-sync-state-response-dto";

export const hasConfirmedGuildDiscordPermissions = (
  syncState: DiscordGuildSyncStateResponseDto | undefined,
) => {
  if (!syncState) {
    return false;
  }

  if (syncState.status === "FAILED") {
    return false;
  }

  return syncState.hasRequiredPermissions;
};
