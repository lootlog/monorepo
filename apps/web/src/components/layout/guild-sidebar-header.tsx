import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";
import { RefreshCcw } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
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
          <m.span
            key={guild?.id ?? "loading"}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15, delay: 0.03 }}
            data-slot="guild-name"
            className="max-w-36 overflow-hidden text-ellipsis text-nowrap text-sm"
          >
            {guild?.name}
          </m.span>
        </AnimatePresence>
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={canTriggerRefreshText}
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (canTriggerRefresh) handleRefreshPermissions();
              }}
              aria-disabled={!canTriggerRefresh}
              loading={refreshMember.isPending}
            >
              <RefreshCcw aria-hidden="true" className="size-4" />
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
