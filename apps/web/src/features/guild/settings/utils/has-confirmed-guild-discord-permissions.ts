import {
  DiscordGuildSyncStatus,
  type DiscordGuildSyncState,
} from "@lootlog/types";

export const hasConfirmedGuildDiscordPermissions = (
  syncState: DiscordGuildSyncState | undefined,
) => {
  if (!syncState) {
    return false;
  }

  if (syncState.status === DiscordGuildSyncStatus.FAILED) {
    return false;
  }

  return syncState.hasRequiredPermissions;
};
