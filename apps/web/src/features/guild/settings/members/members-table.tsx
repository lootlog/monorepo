import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { MemberDeactivationButton } from "@/features/guild/settings/members/components/member-deactivation-button";
import { MemberDiscordSyncIndicator } from "@/features/guild/settings/members/components/member-discord-sync-indicator";
import { MemberSyncButton } from "@/features/guild/settings/members/components/member-sync-button";
import type { MemberActivityStatsByDiscordId } from "@/features/guild/settings/members/member-activity-stats.utils";
import {
  isMemberGamePresenceVerified,
  isMemberOnlineInGame,
} from "@/features/guild/settings/members/member-game-presence.utils";
import {
  isMemberOnlineOnWeb,
  type MemberWebPresenceByDiscordId,
} from "@/features/guild/settings/members/member-web-presence.utils";
import { getMemberOnlineSources } from "@/features/guild/settings/members/member-list-item.utils";
import { MemberStatusBadge } from "@/features/guild/settings/members/member-status-badge";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { cn } from "@lootlog/ui/lib/utils";
import { Permission } from "@lootlog/types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  Crown,
  Gamepad2,
  Globe2,
  MoreHorizontal,
  MousePointerClick,
} from "lucide-react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";

type MembersTableProps = {
  members: GuildMember[];
  guildOwnerId: string | undefined;
  activityStatsByDiscordIdAndSource: MemberActivityStatsByDiscordId;
  scrollElementRef: RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  canManageMembers: boolean;
  memberGamePresenceByDiscordId: Parameters<typeof isMemberOnlineInGame>[0];
  memberWebPresenceByDiscordId: MemberWebPresenceByDiscordId | undefined;
  guildId: string;
};

export const MembersTable = ({
  members,
  guildOwnerId,
  activityStatsByDiscordIdAndSource,
  scrollElementRef,
  isMobile,
  canManageMembers,
  memberGamePresenceByDiscordId,
  memberWebPresenceByDiscordId,
  guildId,
}: MembersTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openMemberDetails = (member: GuildMember) => {
    navigate({
      to: "/$guildId/settings/members/$memberId",
      params: { guildId, memberId: String(member.id) },
    });
  };
  const rowEstimateSize = isMobile ? 88 : 64;
  const rowVirtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => rowEstimateSize,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const topPadding = virtualRows[0]?.start ?? 0;
  const lastVirtualRow = virtualRows[virtualRows.length - 1];
  const bottomPadding =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - (lastVirtualRow?.end ?? 0)
      : 0;

  if (isMobile) {
    return (
      <div className="divide-y divide-border">
        {topPadding > 0 && (
          <div aria-hidden="true" style={{ height: topPadding }} />
        )}
        {virtualRows.map((virtualRow) => {
          const member = members[virtualRow.index];
          if (!member) return null;

          const webActivityStats = activityStatsByDiscordIdAndSource.get(
            member.userId,
          )?.WEB_APP;
          const gameActivityStats = activityStatsByDiscordIdAndSource.get(
            member.userId,
          )?.GAME;
          const isOnlineOnWeb = isMemberOnlineOnWeb(
            memberWebPresenceByDiscordId,
            member.userId,
          );
          const isOnlineInGame = isMemberOnlineInGame(
            memberGamePresenceByDiscordId,
            member.userId,
          );
          const isGamePresenceVerified = isMemberGamePresenceVerified(
            memberGamePresenceByDiscordId,
            member.userId,
          );
          const onlineSources = getMemberOnlineSources({
            isOnlineOnWeb,
            isOnlineInGame,
          });
          const color = getColorFromRole(member.roles);

          return (
            <button
              key={virtualRow.key}
              type="button"
              className="relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => openMemberDetails(member)}
            >
              <Avatar className="size-9 shrink-0 rounded-lg">
                <AvatarImage
                  src={getDiscordAvatarUrl(member.userId, member.avatar)}
                />
                <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span
                  className="block truncate text-sm font-semibold"
                  style={{ color: `#${color}` }}
                >
                  {member.name}
                </span>
                {onlineSources.length > 0 && (
                  <span className="mt-1 flex shrink-0 items-center gap-1">
                    {onlineSources.map((source) => {
                      const Icon = source === "web" ? Globe2 : Gamepad2;
                      const labelKey =
                        source === "web"
                          ? "settings.members.webActivity.onlineSources.web"
                          : "settings.members.webActivity.onlineSources.game";

                      return (
                        <TooltipProvider key={source} delay={100}>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span
                                  className="inline-flex size-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Icon className="size-3.5" />
                                </span>
                              }
                            />
                            <TooltipContent side="top">
                              <p className="text-sm font-semibold">
                                {t(labelKey)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                    {isGamePresenceVerified && (
                      <TooltipProvider delay={100}>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span
                                className="inline-flex size-5 items-center justify-center rounded-md bg-sky-500/10 text-sky-500"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <BadgeCheck className="size-3.5" />
                              </span>
                            }
                          />
                          <TooltipContent side="top">
                            <p className="text-sm font-semibold">
                              {t(
                                "settings.members.webActivity.onlineSources.margonemVerified",
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </span>
                )}
                <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {member.lastDiscordSyncAt
                      ? t("settings.members.discordSync.lastConfirmedCompact", {
                          time: getRelativeTime(member.lastDiscordSyncAt),
                        })
                      : t("settings.members.discordSync.neverSyncedCompact")}
                  </span>
                  <span>
                    {t("settings.members.webActivity.webVisitCountShort", {
                      count: webActivityStats?.visitCount ?? 0,
                    })}
                  </span>
                  <span>
                    {t("settings.members.webActivity.gameVisitCountShort", {
                      count: gameActivityStats?.visitCount ?? 0,
                    })}
                  </span>
                </span>
              </span>
              <MemberStatusBadge member={member} />
            </button>
          );
        })}
        {bottomPadding > 0 && (
          <div aria-hidden="true" style={{ height: bottomPadding }} />
        )}
      </div>
    );
  }

  return (
    <Table className="min-w-[994px] table-fixed">
      <colgroup>
        <col className="w-[360px]" />
        <col className="w-[130px]" />
        <col className="w-[160px]" />
        <col className="w-[150px]" />
        <col className="w-[130px]" />
        <col className="w-16" />
      </colgroup>
      <TableHeader
        className="sticky top-0 z-10 bg-sidebar/95  [&_tr]:!border-b-0"
        style={{ boxShadow: "inset 0 -1px 0 var(--border)" }}
      >
        <TableRow className="h-10 border-b-0 hover:bg-transparent">
          <TableHead>{t("settings.members.table.member")}</TableHead>
          <TableHead>{t("settings.members.table.status")}</TableHead>
          <TableHead>{t("settings.members.table.discord")}</TableHead>
          <TableHead>{t("settings.members.table.activity")}</TableHead>
          <TableHead className="text-right">
            {t("settings.members.table.visits")}
          </TableHead>
          <TableHead className="text-right">
            {t("settings.members.table.actions")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topPadding > 0 && (
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableCell colSpan={6} style={{ height: topPadding }} />
          </TableRow>
        )}
        {virtualRows.map((virtualRow) => {
          const member = members[virtualRow.index];
          if (!member) return null;

          const webActivityStats = activityStatsByDiscordIdAndSource.get(
            member.userId,
          )?.WEB_APP;
          const gameActivityStats = activityStatsByDiscordIdAndSource.get(
            member.userId,
          )?.GAME;
          const isOnlineOnWeb = isMemberOnlineOnWeb(
            memberWebPresenceByDiscordId,
            member.userId,
          );
          const isOnlineInGame = isMemberOnlineInGame(
            memberGamePresenceByDiscordId,
            member.userId,
          );
          const isGamePresenceVerified = isMemberGamePresenceVerified(
            memberGamePresenceByDiscordId,
            member.userId,
          );
          const onlineSources = getMemberOnlineSources({
            isOnlineOnWeb,
            isOnlineInGame,
          });
          const isOnline = onlineSources.length > 0;
          const color = getColorFromRole(member.roles);
          const memberPermissions = Array.from(
            new Set(
              member.roles.flatMap((role) => role.permissions as Permission[]),
            ),
          );
          const hasAdminPermission = memberPermissions.includes(
            Permission.ADMIN,
          );
          const activePermissionCategories = hasAdminPermission
            ? PERMISSION_CATEGORIES.filter((category) =>
                category.permissions.includes(Permission.ADMIN),
              )
            : PERMISSION_CATEGORIES.filter((category) =>
                category.permissions.some((permission) =>
                  memberPermissions.includes(permission),
                ),
              );
          const memberRouteParams = {
            guildId,
            memberId: String(member.id),
          };
          const isLastMember = virtualRow.index === members.length - 1;
          let activityLabel = t("settings.members.webActivity.noVisitsCompact");

          if (isOnlineOnWeb) {
            activityLabel = t("settings.members.webActivity.onlineNowCompact");
          } else if (webActivityStats?.lastSeenAt) {
            activityLabel = t("settings.members.webActivity.lastSeenCompact", {
              time: getRelativeTime(webActivityStats.lastSeenAt),
            });
          }

          return (
            <TableRow
              key={virtualRow.key}
              role="link"
              tabIndex={0}
              className={cn(
                "relative h-16 cursor-pointer border-b transition-colors",
                isLastMember && "border-b-0",
                isOnline
                  ? "border-emerald-500/20 bg-emerald-500/[0.045] hover:bg-emerald-500/[0.075]"
                  : "border-border/70 hover:bg-muted/35",
              )}
              onClickCapture={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button,a,[data-member-row-action]")) {
                  return;
                }

                openMemberDetails(member);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== "") {
                  return;
                }

                event.preventDefault();
                openMemberDetails(member);
              }}
            >
              <TableCell className="min-w-0 overflow-hidden">
                <Link
                  to="/$guildId/settings/members/$memberId"
                  params={memberRouteParams}
                  className="flex min-w-0 items-center gap-3"
                >
                  <Avatar className="size-8 shrink-0 rounded-lg">
                    <AvatarImage
                      src={getDiscordAvatarUrl(member.userId, member.avatar)}
                    />
                    <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="truncate text-sm font-semibold"
                        style={{ color: `#${color}` }}
                      >
                        {member.name}
                      </span>
                      {onlineSources.length > 0 && (
                        <span className="flex shrink-0 items-center gap-1">
                          {onlineSources.map((source) => {
                            const Icon = source === "web" ? Globe2 : Gamepad2;
                            const labelKey =
                              source === "web"
                                ? "settings.members.webActivity.onlineSources.web"
                                : "settings.members.webActivity.onlineSources.game";

                            return (
                              <TooltipProvider key={source} delay={100}>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <span
                                        className="inline-flex size-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500"
                                        onClick={(event) =>
                                          event.stopPropagation()
                                        }
                                      >
                                        <Icon className="size-3.5" />
                                      </span>
                                    }
                                  />
                                  <TooltipContent side="top">
                                    <p className="text-sm font-semibold">
                                      {t(labelKey)}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                          {isGamePresenceVerified && (
                            <TooltipProvider delay={100}>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <span
                                      className="inline-flex size-5 items-center justify-center rounded-md bg-sky-500/10 text-sky-500"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                    >
                                      <BadgeCheck className="size-3.5" />
                                    </span>
                                  }
                                />
                                <TooltipContent side="top">
                                  <p className="text-sm font-semibold">
                                    {t(
                                      "settings.members.webActivity.onlineSources.margonemVerified",
                                    )}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
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
                        {activePermissionCategories.map((category) => {
                          const activePermissions = category.permissions.filter(
                            (permission) =>
                              memberPermissions.includes(permission),
                          );

                          return (
                            <PermissionCategoryTooltip
                              key={category.name}
                              category={category}
                              activePermissions={activePermissions}
                              side="top"
                              onClick={(event) => event.stopPropagation()}
                            />
                          );
                        })}
                      </TooltipProvider>
                    </div>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="overflow-hidden">
                <Link
                  to="/$guildId/settings/members/$memberId"
                  params={memberRouteParams}
                  className="block truncate"
                >
                  <MemberStatusBadge member={member} />
                </Link>
              </TableCell>
              <TableCell className="overflow-hidden text-xs text-muted-foreground">
                <Link
                  to="/$guildId/settings/members/$memberId"
                  params={memberRouteParams}
                  className="block truncate"
                >
                  {member.lastDiscordSyncAt
                    ? t("settings.members.discordSync.lastConfirmedCompact", {
                        time: getRelativeTime(member.lastDiscordSyncAt),
                      })
                    : t("settings.members.discordSync.neverSyncedCompact")}
                </Link>
              </TableCell>
              <TableCell className="overflow-hidden text-xs text-muted-foreground">
                <Link
                  to="/$guildId/settings/members/$memberId"
                  params={memberRouteParams}
                  className="block truncate"
                >
                  {activityLabel}
                </Link>
              </TableCell>
              <TableCell className="overflow-hidden text-right text-xs tabular-nums">
                <Link
                  to="/$guildId/settings/members/$memberId"
                  params={memberRouteParams}
                  className="inline-flex max-w-full items-center justify-end gap-3"
                >
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MousePointerClick className="size-3 text-muted-foreground" />
                    <span className="truncate">
                      {webActivityStats?.visitCount ?? 0}
                    </span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Gamepad2 className="size-3 text-muted-foreground" />
                    <span className="truncate">
                      {gameActivityStats?.visitCount ?? 0}
                    </span>
                  </span>
                </Link>
              </TableCell>
              <TableCell
                data-member-row-action
                className="text-right"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
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
              </TableCell>
            </TableRow>
          );
        })}
        {bottomPadding > 0 && (
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableCell colSpan={6} style={{ height: bottomPadding }} />
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
