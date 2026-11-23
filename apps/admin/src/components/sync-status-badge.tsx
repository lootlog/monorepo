import type { DiscordGuildSyncStatus } from "@lootlog/schema/discord";
import { Badge } from "@lootlog/ui/components/badge";
import { syncStatusText, text } from "@/lib/messages";

const variant = {
  SYNCED: "ready",
  SYNCING: "secondary",
  STALE: "secondary",
  FAILED: "destructive",
  NOT_FOUND: "destructive",
} as const;

export function SyncStatusBadge({
  status,
  hasRequiredPermissions,
}: {
  status: DiscordGuildSyncStatus | null;
  hasRequiredPermissions: boolean;
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {status === null ? (
        <span className="text-muted-foreground">{text.discordNever}</span>
      ) : (
        <Badge variant={variant[status]}>{syncStatusText[status]}</Badge>
      )}
      {status !== null && !hasRequiredPermissions ? (
        <Badge variant="destructive">{text.missingPermissionsBadge}</Badge>
      ) : null}
    </span>
  );
}
