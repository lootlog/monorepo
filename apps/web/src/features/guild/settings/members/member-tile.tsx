import { MetaItem } from "@/components/common/meta-item";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { MemberDiscordSyncIndicator } from "@/features/guild/settings/members/components/member-discord-sync-indicator";
import { MemberSyncButton } from "@/features/guild/settings/members/components/member-sync-button";
import { MemberStatusBadge } from "@/features/guild/settings/members/member-status-badge";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Crown,
  Gamepad2,
  MoreHorizontal,
  MousePointerClick,
  RefreshCw,
  UserRound,
  UserX,
} from "lucide-react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { getActivePermissionCategories } from "../roles/active-permission-categories";
import type { getMemberDisplayData } from "./member-display-data";
import { MemberPresenceBadges } from "./member-presence-badges";

type MemberTileProps = {
  ref?: Ref<HTMLDivElement>;
  index: number;
  guildId: string;
  member: GuildMember;
  displayData: ReturnType<typeof getMemberDisplayData>;
  isOwner: boolean;
  canManageMembers: boolean;
  onDeactivate: () => void;
};

/**
 * One member: presence beside the name, Discord sync, activity and visits
 * under it, then permissions and access. The tile opens the member; the
 * menu refreshes or deactivates them.
 */
export const MemberTile = ({
  ref,
  index,
  guildId,
  member,
  displayData,
  isOwner,
  canManageMembers,
  onDeactivate,
}: MemberTileProps) => {
  const { t } = useTranslation();

  const {
    color,
    gameActivityStats,
    isGamePresenceVerified,
    isOnlineOnWeb,
    onlineSources,
    webActivityStats,
  } = displayData;

  const activePermissionCategories = getActivePermissionCategories(
    member.roles.flatMap((role) => role.permissions),
  );

  let activityLabel = t("settings.members.webActivity.noVisitsCompact");

  if (isOnlineOnWeb) {
    activityLabel = t("settings.members.webActivity.onlineNowCompact");
  } else if (webActivityStats?.lastSeenAt) {
    activityLabel = t("settings.members.webActivity.lastSeenCompact", {
      time: getRelativeTime(webActivityStats.lastSeenAt),
    });
  }

  return (
    <div
      ref={ref}
      data-index={index}
      data-member-id={member.id}
      data-list-tile
      className={LIST_TILE_RULE_CLASS}
    >
      <div className="flex items-center transition-colors hover:bg-muted/30 motion-reduce:transition-none">
        <Link
          to="/$guildId/settings/members/$memberId"
          params={{ guildId, memberId: String(member.id) }}
          className={getListTileLinkClassName(true)}
        >
          <Avatar className="size-9 shrink-0 rounded-lg">
            <AvatarImage
              src={getDiscordAvatarUrl(member.userId, member.avatar)}
            />
            <AvatarFallback className="rounded-lg">
              {member.name.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex h-5 min-w-0 items-center gap-1">
              <span
                className="mr-1 truncate text-sm font-semibold"
                style={{ color: `#${color}` }}
              >
                {member.name}
              </span>
              <TooltipProvider delay={100}>
                {isOwner && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                          <Crown className="size-3.5" />
                        </span>
                      }
                    />
                    <TooltipContent side="top">
                      <p className="text-sm font-semibold">
                        {t("settings.members.owner")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
              <MemberPresenceBadges
                onlineSources={onlineSources}
                isGamePresenceVerified={isGamePresenceVerified}
              />
              <MemberDiscordSyncIndicator member={member} />
            </span>
            <span className="flex min-w-0 items-center gap-x-3 overflow-hidden">
              <MetaItem
                icon={RefreshCw}
                label={t("settings.members.table.discord")}
              >
                {member.lastDiscordSyncAt
                  ? t("settings.members.discordSync.lastConfirmedCompact", {
                      time: getRelativeTime(member.lastDiscordSyncAt),
                    })
                  : t("settings.members.discordSync.neverSyncedCompact")}
              </MetaItem>
              <MetaItem
                icon={Activity}
                label={t("settings.members.table.activity")}
                className="max-md:hidden"
              >
                {activityLabel}
              </MetaItem>
              <MetaItem
                icon={MousePointerClick}
                label={t("settings.members.webActivity.fields.webVisitCount")}
                className="max-sm:hidden"
              >
                {webActivityStats?.visitCount ?? 0}
              </MetaItem>
              <MetaItem
                icon={Gamepad2}
                label={t("settings.members.webActivity.fields.gameVisitCount")}
                className="max-sm:hidden"
              >
                {gameActivityStats?.visitCount ?? 0}
              </MetaItem>
            </span>
          </span>
          {activePermissionCategories.length > 0 && (
            <span className="flex shrink-0 items-center gap-1 max-lg:hidden">
              <TooltipProvider delay={100}>
                {activePermissionCategories.map(
                  ({ category, activePermissions }) => (
                    <PermissionCategoryTooltip
                      key={category.groupKey}
                      category={category}
                      activePermissions={activePermissions}
                      side="top"
                    />
                  ),
                )}
              </TooltipProvider>
            </span>
          )}
          <span className="flex shrink-0 justify-end">
            <MemberStatusBadge member={member} />
          </span>
        </Link>
        <div className={LIST_TILE_ACTIONS_CLASS}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-member-actions
                  className="text-muted-foreground"
                  aria-label={t("settings.members.actions.moreNamed", {
                    name: member.name,
                  })}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                render={
                  <Link
                    to="/$guildId/settings/members/$memberId"
                    params={{ guildId, memberId: String(member.id) }}
                  />
                }
              >
                <UserRound />
                {t("settings.members.actions.viewDetails")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="space-y-1 p-1">
                <MemberSyncButton
                  member={member}
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                />
                {canManageMembers && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={!member.active}
                    onClick={onDeactivate}
                  >
                    <UserX className="size-4" />
                    {t("settings.members.deactivate")}
                  </Button>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
