import type { DiscordGuildSyncStateResponseDtoOutput } from "@/lib/api/generated/main/model";

export const hasConfirmedGuildDiscordPermissions = (
  syncState: DiscordGuildSyncStateResponseDtoOutput | undefined,
) => {
  if (!syncState) {
    return false;
  }

  if (syncState.status === "FAILED") {
    return false;
  }

  return syncState.hasRequiredPermissions;
};
