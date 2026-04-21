import type { DiscordGuildSyncStateResponseDto } from "@/lib/api/generated/main/model";

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
