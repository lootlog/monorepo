import { MemberPresenceBadges } from "./member-presence-badges";
import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { MemberDeactivationButton } from "@/features/guild/settings/members/components/member-deactivation-button";
import { MemberDiscordSyncIndicator } from "@/features/guild/settings/members/components/member-discord-sync-indicator";
import { MemberSyncButton } from "@/features/guild/settings/members/components/member-sync-button";
import { MemberStatusBadge } from "@/features/guild/settings/members/member-status-badge";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
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
import { TextLink } from "@lootlog/ui/components/text-link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Crown,
  Gamepad2,
  MoreHorizontal,
  MousePointerClick,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getActivePermissionCategories } from "../roles/active-permission-categories";

import type { getMemberDisplayData } from "./member-display-data";
import type { MembersTableProps } from "./members-table";

/** Presence and activity travel with the row so the column defs stay stable. */
export type MemberTableRowData = {
  member: GuildMember;
  displayData: ReturnType<typeof getMemberDisplayData>;
};

type ColumnsProps = Pick<
  MembersTableProps,
  "guildId" | "guildOwnerId" | "canManageMembers"
> & {
  openMemberDetails: (member: GuildMember) => void;
};

export function useMembersTableColumns({
  guildId,
  guildOwnerId,
  canManageMembers,
  openMemberDetails,
}: ColumnsProps) {
  const { t } = useTranslation();

  const columns: ColumnDef<typeof coreTableFeatures, MemberTableRowData>[] = [
    {
      id: "member",
      header: () => t("settings.members.table.member"),
      cell: ({
        row: {
          original: { member, displayData },
        },
      }) => {
        const { isGamePresenceVerified, onlineSources } = displayData;

        const activePermissionCategories = getActivePermissionCategories(
          member.roles.flatMap((role) => role.permissions),
        );

        return (
          <TextLink
            className="flex min-w-0 items-center gap-3 text-sm"
            render=<Link
              to="/$guildId/settings/members/$memberId"
              params={{ guildId, memberId: String(member.id) }}
            />
          >
            <Avatar className="size-8 shrink-0 rounded-lg">
              <AvatarImage
                src={getDiscordAvatarUrl(member.userId, member.avatar)}
              />
              <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {member.name}
                </span>
                {onlineSources.length > 0 && (
                  <span className="flex shrink-0 items-center gap-1">
                    <MemberPresenceBadges
                      onlineSources={onlineSources}
                      isGamePresenceVerified={isGamePresenceVerified}
                    />
                  </span>
                )}
              </div>
              <div className="flex min-h-7 flex-wrap items-center gap-1">
                <MemberDiscordSyncIndicator member={member} />
                {member.userId === guildOwnerId && (
                  <TooltipProvider delay={100}>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span
                            className="inline-flex rounded-md bg-amber-500/10 p-1.5 text-amber-400 transition-colors"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Crown className="size-4" />
                          </span>
                        }
                      />
                      <TooltipContent side="top">
                        <p className="text-sm font-semibold">
                          {t("settings.members.owner")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider delay={100}>
                  {activePermissionCategories.map(
                    ({ category, activePermissions }) => {
                      return (
                        <PermissionCategoryTooltip
                          key={category.name}
                          category={category}
                          activePermissions={activePermissions}
                          side="top"
                          onClick={(event) => event.stopPropagation()}
                        />
                      );
                    },
                  )}
                </TooltipProvider>
              </div>
            </div>
          </TextLink>
        );
      },
    },
    {
      id: "status",
      header: () => t("settings.members.table.status"),
      cell: ({
        row: {
          original: { member },
        },
      }) => (
        <Link
          to="/$guildId/settings/members/$memberId"
          params={{ guildId, memberId: String(member.id) }}
          className="block truncate"
        >
          <MemberStatusBadge member={member} />
        </Link>
      ),
    },
    {
      id: "discord",
      header: () => t("settings.members.table.discord"),
      cell: ({
        row: {
          original: { member },
        },
      }) => (
        <TextLink
          className="block truncate text-sm"
          render=<Link
            to="/$guildId/settings/members/$memberId"
            params={{ guildId, memberId: String(member.id) }}
          />
        >
          {member.lastDiscordSyncAt
            ? t("settings.members.discordSync.lastConfirmedCompact", {
                time: getRelativeTime(member.lastDiscordSyncAt),
              })
            : t("settings.members.discordSync.neverSyncedCompact")}
        </TextLink>
      ),
    },
    {
      id: "activity",
      header: () => t("settings.members.table.activity"),
      cell: ({
        row: {
          original: { member, displayData },
        },
      }) => {
        const { isOnlineOnWeb, webActivityStats } = displayData;

        let activityLabel = t("settings.members.webActivity.noVisitsCompact");

        if (isOnlineOnWeb) {
          activityLabel = t("settings.members.webActivity.onlineNowCompact");
        } else if (webActivityStats?.lastSeenAt) {
          activityLabel = t("settings.members.webActivity.lastSeenCompact", {
            time: getRelativeTime(webActivityStats.lastSeenAt),
          });
        }

        return (
          <TextLink
            className="block truncate text-sm"
            render=<Link
              to="/$guildId/settings/members/$memberId"
              params={{ guildId, memberId: String(member.id) }}
            />
          >
            {activityLabel}
          </TextLink>
        );
      },
    },
    {
      id: "visits",
      header: () => t("settings.members.table.visits"),
      cell: ({
        row: {
          original: { member, displayData },
        },
      }) => (
        <TextLink
          className="inline-flex max-w-full items-center justify-end gap-3 text-sm"
          render=<Link
            to="/$guildId/settings/members/$memberId"
            params={{ guildId, memberId: String(member.id) }}
          />
        >
          <span className="inline-flex min-w-0 items-center gap-1">
            <MousePointerClick className="size-3 text-muted-foreground" />
            <span className="truncate">
              {displayData.webActivityStats?.visitCount ?? 0}
            </span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <Gamepad2 className="size-3 text-muted-foreground" />
            <span className="truncate">
              {displayData.gameActivityStats?.visitCount ?? 0}
            </span>
          </span>
        </TextLink>
      ),
    },
    {
      id: "actions",
      header: () => t("settings.members.table.actions"),
      cell: ({
        row: {
          original: { member },
        },
      }) => (
        <div data-settings-row-action>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 md:size-8"
                  aria-label={t("settings.members.actions.more")}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => openMemberDetails(member)}>
                <CheckCircle2 className="size-4" />
                {t("settings.members.actions.viewDetails")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="space-y-1 p-1">
                <MemberSyncButton
                  member={member}
                  className="w-full justify-start"
                />
                {canManageMembers && (
                  <MemberDeactivationButton
                    member={member}
                    className="w-full justify-start"
                    onDeactivated={() => undefined}
                  />
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return columns;
}
