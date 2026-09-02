import type { DiscordGuildSyncStateResponseDto } from "@lootlog/client/main";

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
