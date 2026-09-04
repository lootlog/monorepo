import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Button } from "@lootlog/ui/components/button";
import { RefreshCcw } from "lucide-react";
import { useContext, type FC } from "react";
import type { MemberResponseDto as GuildMember } from "@lootlog/client/main";
import { getPermissionRefreshInfo } from "@/utils/get-permission-refresh-info";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshStatusContext } from "@/features/guild/settings/members/contexts/refresh-status-context";
import { toast } from "sonner";
import { getLootsControllerFetchLootsByGuildIdQueryKey } from "@lootlog/client/main";
import {
  getMembersControllerGetGuildMembersQueryKey,
  useMembersControllerRefreshMember,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { cn } from "cn";

export type MemberSyncButtonProps = {
  member: GuildMember;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  onMemberUpdated?: (member: GuildMember | null) => void;
};

export const MemberSyncButton: FC<MemberSyncButtonProps> = ({
  member,
  className,
  variant = "secondary",
  onMemberUpdated,
}) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const refreshStatusContext = useContext(RefreshStatusContext);
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
            onMemberUpdated?.(data);
            if (data.active) {
              toast.success(t("settings.members.refreshSuccess"));
            } else {
              toast.warning(t("settings.members.refreshAccessDisabled"));
            }
          } else {
            onMemberUpdated?.(null);
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
  let canTriggerRefreshText = t("settings.members.refreshNoDiscordSync");

  if (refreshReferenceAt && canTriggerRefresh) {
    canTriggerRefreshText = t(
      "settings.members.refreshMemberPermissionsTooltip",
    );
  } else if (refreshReferenceAt) {
    canTriggerRefreshText = permissionRefreshInfo.canTriggerRefreshText;
  }
  let tooltipText = canTriggerRefreshText;

  if (!canRefresh) {
    tooltipText = t("settings.members.refreshUnavailable");
  } else if (member.refreshQueued) {
    tooltipText = t("settings.members.refreshQueued");
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span>
            <Button
              className={cn("justify-center", className)}
              size="sm"
              variant={variant}
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
              <RefreshCcw
                className={cn("size-4", isPending && "animate-spin")}
              />
              {t("settings.members.refreshPermissions")}
            </Button>
          </span>
        }
      />
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};
