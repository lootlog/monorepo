import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";
import { RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeMeta } from "@/themes";
import { getLootsControllerFetchLootsByGuildIdQueryKey } from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  invalidateGuildsControllerGetGuildPermissions,
  useGuildsControllerGetGuildById,
} from "@lootlog/client/main";
import {
  getMembersControllerGetMeQueryKey,
  invalidateMembersControllerGetMe,
  useMembersControllerGetMe,
  useMembersControllerRefreshMe,
} from "@lootlog/client/main";

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
        <AnimatePresence mode="wait">
          <motion.span
            key={guild?.id ?? "loading"}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15, delay: 0.03 }}
            className={cn(
              "max-w-36 overflow-hidden text-ellipsis text-nowrap text-sm",
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
          </motion.span>
        </AnimatePresence>
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <span tabIndex={0}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={canTriggerRefreshText}
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={handleRefreshPermissions}
                disabled={!canTriggerRefresh}
                loading={refreshMember.isPending}
              >
                <RefreshCcw aria-hidden="true" className="size-4" />
              </Button>
            </span>
          }
        />
        <TooltipContent className="z-50 mt-4">
          {canTriggerRefreshText}
        </TooltipContent>
      </Tooltip>
    </>
  );
};
