import type { DiscordGuildSyncStateResponseDto } from "@lootlog/client/main";

export const getGuildDiscordPermissionStatus = (
  syncState: DiscordGuildSyncStateResponseDto | undefined,
): "unknown" | "ok" | "missing" => {
  if (syncState?.status === "NOT_FOUND") return "missing";

  // A snapshot that is only old keeps the permissions of its last successful
  // sync, which the API still enforces. A failed read or a snapshot that never
  // synced carries no current evidence.
  const isConfirmed =
    syncState?.status === "SYNCED" ||
    (syncState?.status === "STALE" &&
      syncState.lastSuccessAt !== null &&
      syncState.lastError === null);

  if (!isConfirmed) return "unknown";

  return syncState.hasRequiredPermissions ? "ok" : "missing";
};
