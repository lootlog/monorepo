import { Crown, Gamepad2, Globe2 } from "lucide-react";
import { type FC, useMemo } from "react";
import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";
import type { MemberActivityStats } from "@/features/guild/settings/members/member-activity-stats-api";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Avatar, AvatarImage } from "@lootlog/ui/components/avatar";
import { useSelectorPanel } from "@/components/selector-panel";
import { SelectableListCard } from "@/components/selectable-list-card";
import { Permission } from "@lootlog/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { MemberDiscordSyncIndicator } from "@/features/guild/settings/members/components/member-discord-sync-indicator";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { isMemberOnlineOnWeb } from "@/features/guild/settings/members/member-activity-stats.utils";
import {
  getMemberListItemClassName,
  getMemberOnlineSources,
} from "@/features/guild/settings/members/member-list-item.utils";

export type MemberListItemProps = {
  member: GuildMember;
  isOwner?: boolean;
  activityStats?: MemberActivityStats;
  gameActivityStats?: MemberActivityStats;
  isOnlineInGame?: boolean;
};

export const MemberListItem: FC<MemberListItemProps> = ({
  member,
  isOwner = false,
  activityStats,
  gameActivityStats,
  isOnlineInGame = false,
}) => {
  const { t } = useTranslation();
  const { selectedItem, handleSelect } = useSelectorPanel<GuildMember>();

  const isSelected = selectedItem?.id === member.id;
  const isPanelOpen = selectedItem !== null;
  const color = getColorFromRole(member.roles);
  const avatarUrl = getDiscordAvatarUrl(member.userId, member.avatar);
  const isOnlineOnWeb = isMemberOnlineOnWeb(activityStats);
  const isOnline = isOnlineOnWeb || isOnlineInGame;
  const onlineSources = getMemberOnlineSources({
    isOnlineOnWeb,
    isOnlineInGame,
  });
  let webActivityLabel = t("settings.members.webActivity.noVisits");

  if (activityStats?.lastSeenAt) {
    webActivityLabel = t("settings.members.webActivity.lastSeenRelative", {
      time: getRelativeTime(activityStats.lastSeenAt),
    });
  }

  const memberPermissions = useMemo(() => {
    const perms = new Set<Permission>();
    for (const role of member.roles) {
      for (const perm of role.permissions) {
        perms.add(perm as Permission);
      }
    }
    return Array.from(perms);
  }, [member.roles]);

  const hasAdminPermission = memberPermissions.includes(Permission.ADMIN);

  const activeCategories = hasAdminPermission
    ? PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.includes(Permission.ADMIN),
      )
    : PERMISSION_CATEGORIES.filter((category) =>
        category.permissions.some((perm) => memberPermissions.includes(perm)),
      );

  const iconsContent = (
    <>
      <MemberDiscordSyncIndicator member={member} />
      {isOwner && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="p-1.5 rounded-md transition-colors bg-amber-500/10"
                onClick={(e) => e.stopPropagation()}
              >
                <Crown className="size-4 text-amber-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-sm">
                {t("settings.members.owner")}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <TooltipProvider delayDuration={100}>
        {activeCategories.map((category) => {
          const activePerms = category.permissions.filter((perm) =>
            memberPermissions.includes(perm),
          );

          return (
            <PermissionCategoryTooltip
              key={category.name}
              category={category}
              activePermissions={activePerms}
              side="top"
              onClick={(e) => e.stopPropagation()}
            />
          );
        })}
      </TooltipProvider>
    </>
  );

  return (
    <SelectableListCard
      isSelected={isSelected}
      onClick={() => handleSelect(member)}
      icons={iconsContent}
      showIcons={!isPanelOpen}
      className={getMemberListItemClassName({
        isOnline,
        isActive: member.active,
      })}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={avatarUrl} />
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="truncate text-sm font-medium"
            style={{ color: `#${color}` }}
          >
            {member.name}
          </div>
          {onlineSources.length > 0 && (
            <TooltipProvider delayDuration={100}>
              <div className="flex shrink-0 items-center gap-1">
                {onlineSources.map((source) => {
                  const Icon = source === "web" ? Globe2 : Gamepad2;
                  const labelKey =
                    source === "web"
                      ? "settings.members.webActivity.onlineSources.web"
                      : "settings.members.webActivity.onlineSources.game";

                  return (
                    <Tooltip key={source}>
                      <TooltipTrigger asChild>
                        <span
                          className="inline-flex size-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Icon className="size-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-sm font-semibold">{t(labelKey)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            {member.lastDiscordSyncAt
              ? t("settings.members.discordSync.lastConfirmedRelative", {
                  time: getRelativeTime(member.lastDiscordSyncAt),
                })
              : t("settings.members.discordSync.notConfirmed")}
          </span>
          <span>{webActivityLabel}</span>
          <span>
            {t("settings.members.webActivity.webVisitCountCompact", {
              count: activityStats?.visitCount ?? 0,
            })}
          </span>
          <span>
            {t("settings.members.webActivity.gameVisitCountCompact", {
              count: gameActivityStats?.visitCount ?? 0,
            })}
          </span>
        </div>
      </div>
    </SelectableListCard>
  );
};
