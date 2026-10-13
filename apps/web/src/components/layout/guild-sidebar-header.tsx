import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";
import { RefreshCw } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { useThemeMeta } from "@/themes";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  invalidateGuildsControllerGetGuildPermissions,
  getMembersControllerGetMeQueryKey,
  invalidateMembersControllerGetMe,
  useMembersControllerGetMe,
  useMembersControllerRefreshMe,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserGuild } from "@/hooks/api/use-current-user-guild";

export const GuildSidebarHeader = ({ guildId }: { guildId?: string }) => {
  const queryClient = useQueryClient();
  const hasGuildId = Boolean(guildId);

  // The rail entry names the server even without Lootlog access, and it is
  // already loaded, so switching servers never blanks the header.
  const guild = useCurrentUserGuild(guildId);
  const hasAccess = guild?.hasLootlogAccess !== false;

  const { data: member } = useMembersControllerGetMe(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: hasGuildId && hasAccess,
        queryKey: getMembersControllerGetMeQueryKey({
          guildId: guildId ?? "",
        }),
        staleTime: 30_000,
      },
    },
  );

  const refreshMember = useMembersControllerRefreshMe({
    mutation: {
      onSuccess: async (_, variables) => {
        if (!variables?.pathParams.guildId) {
          return;
        }

        await Promise.all([
          invalidateMembersControllerGetMe(queryClient, {
            guildId: variables.pathParams.guildId,
          }),
          invalidateGuildsControllerGetGuildPermissions(queryClient, {
            guildId: variables.pathParams.guildId,
          }),
          queryClient.invalidateQueries({
            queryKey: getLootsControllerFetchLootsByGuildIdQueryKey({
              guildId: variables.pathParams.guildId,
            }),
          }),
        ]);
      },
    },
  });

  const { isRukiaTheme, isRiasTheme } = useThemeMeta();
  const currentTimestamp = useMinuteTimestamp();

  const { canTriggerRefresh, canTriggerRefreshText } = getPermissionRefreshInfo(
    member?.updatedAt,
    currentTimestamp,
  );

  const handleRefreshPermissions = () => {
    if (!guildId) {
      return;
    }

    refreshMember.mutate({
      pathParams: { guildId },
    });
  };

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center pl-3">
        <AnimatePresence mode="wait">
          <m.span
            key={guild?.id ?? "loading"}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15, delay: 0.03 }}
            className="flex min-w-0 items-center gap-2.5"
          >
            {guild && (
              <Avatar className="size-6 rounded-md">
                <AvatarImage src={guild.icon ?? undefined} alt="" />
                <AvatarFallback className="rounded-none text-[10px] font-medium">
                  {guild.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <span
              className={cn(
                "truncate text-sm",
                (isRukiaTheme || isRiasTheme) && "font-semibold",
              )}
              style={
                isRukiaTheme
                  ? {
                      background:
                        "linear-gradient(135deg, #e0f4ff 0%, #a8d8ff 30%, #7cc4ff 50%, #b8e0ff 70%, #ffffff 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      filter:
                        "drop-shadow(0 0 4px rgba(180, 220, 255, 0.6)) drop-shadow(0 0 8px rgba(150, 200, 255, 0.3))",
                    }
                  : undefined
              }
            >
              {guild?.name}
            </span>
          </m.span>
        </AnimatePresence>
      </div>
      {hasAccess && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={canTriggerRefreshText}
                className={cn(
                  "text-muted-foreground transition-[color,opacity] hover:text-foreground focus-visible:opacity-100",
                  !refreshMember.isPending &&
                    "pointer-fine:opacity-0 pointer-fine:group-hover/sidebar-header:opacity-100",
                )}
                onClick={() => {
                  if (canTriggerRefresh) handleRefreshPermissions();
                }}
                aria-disabled={!canTriggerRefresh}
                loading={refreshMember.isPending}
              >
                <RefreshCw aria-hidden="true" className="size-4" />
              </Button>
            }
          />
          <TooltipContent className="z-50 mt-4">
            {canTriggerRefreshText}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );
};
