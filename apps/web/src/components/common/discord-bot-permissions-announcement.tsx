import { Button } from "@lootlog/ui/components/button";
import { notificationsApiClient } from "@/lib/api-client/api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { Permission } from "@lootlog/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCcw, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

type PermissionsStatusResponse = {
  ok: boolean;
  missingPermissions: string[];
  checkedAt: string;
  cacheTtlSeconds: number;
  reason?: string;
};

const STORAGE_KEY = "lootlog:discord-bot-permissions-announcement:dismissed";

export const DiscordBotPermissionsAnnouncement = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { data: permissions } = useGuildPermissions();
  const [dismissedByGuild, setDismissedByGuild] = useLocalStorage<
    Record<string, boolean>
  >(STORAGE_KEY, {});

  const isAdminOrOwner = Boolean(
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER),
  );

  const isDismissed = guildId ? Boolean(dismissedByGuild[guildId]) : false;

  const statusQuery = useQuery({
    queryKey: ["discord-bot-permissions-status", guildId],
    queryFn: async () => {
      const response =
        await notificationsApiClient.get<PermissionsStatusResponse>(
          `/guilds/${guildId}/discord-notifications/permissions-status`,
        );
      return response.data;
    },
    enabled: Boolean(guildId && isAdminOrOwner),
    staleTime: 60_000,
    retry: 1,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await notificationsApiClient.post(
        `/guilds/${guildId}/discord-notifications/permissions-status/refresh`,
      );
    },
    onSuccess: async () => {
      if (!guildId) {
        return;
      }

      setDismissedByGuild((prev) => ({
        ...prev,
        [guildId]: false,
      }));

      await queryClient.invalidateQueries({
        queryKey: ["discord-bot-permissions-status", guildId],
      });
    },
  });

  const handleDismiss = () => {
    if (!guildId) {
      return;
    }

    setDismissedByGuild((prev) => ({
      ...prev,
      [guildId]: true,
    }));
  };

  if (!guildId || !isAdminOrOwner || isDismissed) {
    return null;
  }

  const status = statusQuery.data;

  if (!status || status.ok || status.reason === "NOT_CONFIGURED") {
    return null;
  }

  const missing = status.missingPermissions.length
    ? status.missingPermissions.join(", ")
    : "Unknown permissions";

  return (
    <div className="w-full relative z-[100] bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 border-b border-amber-300/40 shadow-lg shrink-0">
      <div className="w-full px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span className="text-white font-semibold text-sm whitespace-nowrap">
              Brak uprawnień bota
            </span>
            <span className="text-white/90 text-sm truncate">
              Niektóre funkcje powiadomień mogą nie działać. Brakuje: {missing}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1" />
            Odśwież
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
