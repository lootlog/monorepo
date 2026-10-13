import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";
import { RefreshCw } from "lucide-react";
import { useThemeMeta } from "@/themes";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  getGuildsControllerGetGuildByIdQueryKey,
  invalidateGuildsControllerGetGuildPermissions,
  useGuildsControllerGetGuildById,
  getMembersControllerGetMeQueryKey,
  invalidateMembersControllerGetMe,
  useMembersControllerGetMe,
  useMembersControllerRefreshMe,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";

export const GuildSidebarHeader = ({ guildId }: { guildId?: string }) => {
  const queryClient = useQueryClient();
  const hasGuildId = Boolean(guildId);

  const { data: guild } = useGuildsControllerGetGuildById(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getGuildsControllerGetGuildByIdQueryKey({
          guildId: guildId ?? "",
        }),
        retry: false,
      },
    },
  );

  const { data: member } = useMembersControllerGetMe(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: hasGuildId,
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
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-3">
        <span
          key={guild?.id ?? "loading"}
          className={cn(
            "max-w-36 overflow-hidden text-ellipsis text-nowrap text-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
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
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={canTriggerRefreshText}
              className="text-muted-foreground hover:text-foreground"
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
    </>
  );
};
