import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { RefreshCcw } from "lucide-react";
import { useContext, type FC } from "react";
import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshStatusContext } from "@/features/guild/settings/members/contexts/refresh-status-context";
import { toast } from "sonner";
import { getLootsControllerFetchLootsByGuildIdQueryKey } from "@/lib/api/generated/main/loots/loots";
import {
  getMembersControllerGetGuildMembersQueryKey,
  useMembersControllerRefreshMember,
} from "@/lib/api/generated/main/members/members";
import { useTranslation } from "react-i18next";

export type MemberSyncButtonProps = {
  member: GuildMember;
};

export const MemberSyncButton: FC<MemberSyncButtonProps> = ({ member }) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const refreshStatusContext = useContext(RefreshStatusContext);
  const { mutate: refreshMember, isPending } =
    useMembersControllerRefreshMember({
      mutation: {
        onSuccess: (_data, variables) => {
          const now = new Date().toISOString();
          const currentGuildId = String(variables.pathParams.guildId);
          const memberId = String(variables.pathParams.discordId);

          queryClient.setQueriesData(
            {
              queryKey: getMembersControllerGetGuildMembersQueryKey({
                guildId: currentGuildId,
              }),
            },
            (oldData: GuildMember[] | undefined) => {
              if (!oldData) {
                return oldData;
              }

              return oldData.map((guildMember) =>
                guildMember.userId === memberId
                  ? { ...guildMember, updatedAt: now, isStale: false }
                  : guildMember,
              );
            },
          );

          if (refreshStatusContext) {
            refreshStatusContext.markAsRefreshed([memberId]);
          }

          toast.success(t("settings.members.refreshSuccess"));

          void Promise.all([
            queryClient.invalidateQueries({
              queryKey: getMembersControllerGetGuildMembersQueryKey({
                guildId: currentGuildId,
              }),
            }),
            queryClient.invalidateQueries({
              queryKey: getLootsControllerFetchLootsByGuildIdQueryKey({
                guildId: currentGuildId,
              }),
            }),
          ]);
        },
        onError: (_error, variables) => {
          const memberId = variables?.pathParams.discordId;

          if (memberId && refreshStatusContext) {
            refreshStatusContext.markAsFailed([memberId]);
          }

          toast.error(t("settings.members.refreshError"));
        },
      },
    });

  const canRefresh = Boolean(member.globalUserId);
  const { canTriggerRefresh, canTriggerRefreshText } = getPermissionRefreshInfo(
    member.updatedAt,
  );
  const tooltipText = canRefresh
    ? canTriggerRefreshText
    : t("settings.members.refreshUnavailable");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            className="size-8 rounded-full"
            size="sm"
            variant="secondary"
            disabled={isPending || !canRefresh || !canTriggerRefresh}
            onClick={(e) => {
              e.stopPropagation();
              if (!guildId) {
                return;
              }

              refreshMember({
                pathParams: {
                  guildId,
                  discordId: member.userId,
                },
              });
            }}
          >
            <RefreshCcw />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};
