import type { MemberActivityStatsByDiscordId } from "@/features/guild/settings/members/member-activity-stats.utils";
import type { isMemberOnlineInGame } from "@/features/guild/settings/members/member-game-presence.utils";
import { MemberStatusBadge } from "@/features/guild/settings/members/member-status-badge";
import type { MemberWebPresenceByDiscordId } from "@/features/guild/settings/members/member-web-presence.utils";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
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
import { useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BadgeCheck, Gamepad2, Globe2 } from "lucide-react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { getMemberDisplayData } from "./member-display-data";
import { MemberTableRow } from "./member-table-row";

export type MembersTableProps = {
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

          const {
            webActivityStats,
            gameActivityStats,
            isGamePresenceVerified,
            onlineSources,
            color,
          } = getMemberDisplayData(member, {
            activityStatsByDiscordIdAndSource,
            memberGamePresenceByDiscordId,
            memberWebPresenceByDiscordId,
          });

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
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow className="border-b-1! border-border">
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

          return (
            <MemberTableRow
              key={virtualRow.key}
              member={member}
              displayData={getMemberDisplayData(member, {
                activityStatsByDiscordIdAndSource,
                memberGamePresenceByDiscordId,
                memberWebPresenceByDiscordId,
              })}
              isLastMember={virtualRow.index === members.length - 1}
              openMemberDetails={openMemberDetails}
              guildId={guildId}
              guildOwnerId={guildOwnerId}
              canManageMembers={canManageMembers}
            />
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
