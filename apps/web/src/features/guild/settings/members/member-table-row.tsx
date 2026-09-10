import { PermissionCategoryTooltip } from "@/features/guild/settings/components/permission-category-tooltip";
import { MemberDeactivationButton } from "@/features/guild/settings/members/components/member-deactivation-button";
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
import { TableCell, TableRow } from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
  BadgeCheck,
  CheckCircle2,
  Crown,
  Gamepad2,
  Globe2,
  MoreHorizontal,
  MousePointerClick,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getActivePermissionCategories } from "../roles/active-permission-categories";

import type { getMemberDisplayData } from "./member-display-data";
import type { MembersTableProps } from "./members-table";

type MemberTableRowProps = Pick<
  MembersTableProps,
  "guildId" | "guildOwnerId" | "canManageMembers"
> & {
  member: GuildMember;
  displayData: ReturnType<typeof getMemberDisplayData>;
  isLastMember: boolean;
  openMemberDetails: (member: GuildMember) => void;
};

export function MemberTableRow({
  member,
  displayData,
  isLastMember,
  openMemberDetails,
  guildId,
  guildOwnerId,
  canManageMembers,
}: MemberTableRowProps) {
  const { t } = useTranslation();

  const {
    webActivityStats,
    gameActivityStats,
    isOnlineOnWeb,
    isGamePresenceVerified,
    onlineSources,
  } = displayData;

  const isOnline = onlineSources.length > 0;

  const activePermissionCategories = getActivePermissionCategories(
    member.roles.flatMap((role) => role.permissions),
  );

  const memberRouteParams = {
    guildId,
    memberId: String(member.id),
  };

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
      role="link"
      tabIndex={0}
      className={cn(
        "relative h-16 cursor-pointer border-b transition-colors",
        isLastMember && "border-b-0",
        isOnline
          ? "border-emerald-500/20 bg-emerald-500/[0.045] hover:bg-emerald-500/[0.075]"
          : "border-border hover:bg-accent/35",
      )}
      onClickCapture={(event) => {
        const target = event.target;

        if (
          target instanceof Element &&
          target.closest("button,a,[data-member-row-action]")
        ) {
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
        <TextLink
          className="flex min-w-0 items-center gap-3 text-sm"
          render=<Link
            to="/$guildId/settings/members/$memberId"
            params={memberRouteParams}
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
        <TextLink
          className="block truncate text-sm"
          render=<Link
            to="/$guildId/settings/members/$memberId"
            params={memberRouteParams}
          />
        >
          {member.lastDiscordSyncAt
            ? t("settings.members.discordSync.lastConfirmedCompact", {
                time: getRelativeTime(member.lastDiscordSyncAt),
              })
            : t("settings.members.discordSync.neverSyncedCompact")}
        </TextLink>
      </TableCell>
      <TableCell className="overflow-hidden text-xs text-muted-foreground">
        <TextLink
          className="block truncate text-sm"
          render=<Link
            to="/$guildId/settings/members/$memberId"
            params={memberRouteParams}
          />
        >
          {activityLabel}
        </TextLink>
      </TableCell>
      <TableCell className="overflow-hidden text-right text-xs tabular-nums">
        <TextLink
          className="inline-flex max-w-full items-center justify-end gap-3 text-sm"
          render=<Link
            to="/$guildId/settings/members/$memberId"
            params={memberRouteParams}
          />
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
        </TextLink>
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
      </TableCell>
    </TableRow>
  );
}
