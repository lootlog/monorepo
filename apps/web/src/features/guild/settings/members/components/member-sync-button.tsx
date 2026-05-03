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
import { cn } from "@lootlog/ui/lib/utils";
import { useSelectorPanel } from "@/components/selector-panel";

export type MemberSyncButtonProps = {
  member: GuildMember;
};

export const MemberSyncButton: FC<MemberSyncButtonProps> = ({ member }) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const refreshStatusContext = useContext(RefreshStatusContext);
  const { setSelectedItem } = useSelectorPanel<GuildMember>();
  const { mutate: refreshMember, isPending } =
    useMembersControllerRefreshMember({
      mutation: {
        onSuccess: (data, variables) => {
          const currentGuildId = String(variables.pathParams.guildId);
          const memberId = String(variables.pathParams.discordId);

          if (data) {
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
                  guildMember.userId === memberId ? data : guildMember,
                );
              },
            );
            setSelectedItem(data);
            if (data.active) {
              toast.success(t("settings.members.refreshSuccess"));
            } else {
              toast.warning(t("settings.members.refreshAccessDisabled"));
            }
          } else {
            setSelectedItem(null);
            toast.warning(t("settings.members.refreshNotFound"));
          }

          if (refreshStatusContext) {
            refreshStatusContext.markAsRefreshed([memberId]);
          }

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
  const refreshReferenceAt = member.lastDiscordSyncAt;
  const permissionRefreshInfo = getPermissionRefreshInfo(refreshReferenceAt);
  const canTriggerRefresh = refreshReferenceAt
    ? permissionRefreshInfo.canTriggerRefresh
    : true;
  const canTriggerRefreshText = refreshReferenceAt
    ? permissionRefreshInfo.canTriggerRefreshText
    : t("settings.members.refreshNoDiscordSync");
  let tooltipText = canTriggerRefreshText;

  if (!canRefresh) {
    tooltipText = t("settings.members.refreshUnavailable");
  } else if (member.refreshQueued) {
    tooltipText = t("settings.members.refreshQueued");
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            className="justify-center"
            size="sm"
            variant="secondary"
            disabled={
              isPending ||
              !canRefresh ||
              member.refreshQueued ||
              !canTriggerRefresh
            }
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
            <RefreshCcw className={cn("size-4", isPending && "animate-spin")} />
            {t("settings.members.refreshPermissions")}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};
