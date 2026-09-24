import type { DiscordGuildSyncStateResponseDto } from "@lootlog/client/main";

export const getGuildDiscordPermissionStatus = (
  syncState: DiscordGuildSyncStateResponseDto | undefined,
): "unknown" | "ok" | "missing" => {
  if (syncState?.status === "NOT_FOUND") return "missing";

  // Unavailable and stale snapshots contain placeholder permission values.
  if (syncState?.status !== "SYNCED") return "unknown";

  return syncState.hasRequiredPermissions ? "ok" : "missing";
};
