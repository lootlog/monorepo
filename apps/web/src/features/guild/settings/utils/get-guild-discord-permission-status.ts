import type { DiscordGuildSyncStateResponseDto } from "@lootlog/client/main";

export const getGuildDiscordPermissionStatus = (
  syncState: DiscordGuildSyncStateResponseDto | undefined,
): "unknown" | "ok" | "missing" => {
  if (syncState?.status === "NOT_FOUND") return "missing";

  // A stale snapshot keeps the permissions of its last successful sync, which
  // the API still enforces. Snapshots that never synced carry placeholders.
  const isConfirmed =
    syncState?.status === "SYNCED" ||
    (syncState?.status === "STALE" && syncState.lastSuccessAt !== null);

  if (!isConfirmed) return "unknown";

  return syncState.hasRequiredPermissions ? "ok" : "missing";
};
