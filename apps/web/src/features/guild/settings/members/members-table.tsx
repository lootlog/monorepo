import { MemberPresenceBadges } from "./member-presence-badges";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { MemberActivityStatsByDiscordId } from "@/features/guild/settings/members/member-activity-stats.utils";
import type { isMemberOnlineInGame } from "@/features/guild/settings/members/member-game-presence.utils";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { MemberStatusBadge } from "@/features/guild/settings/members/member-status-badge";
import type { MemberWebPresenceByDiscordId } from "@/lib/web-presence";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import {
  getVirtualListPadding,
  usePageVirtualizer,
} from "@/hooks/utils/use-page-scroll";
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
  TableRow,
} from "@lootlog/ui/components/table";
import { useNavigate } from "@tanstack/react-router";
import { useTable } from "@tanstack/react-table";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMemberDisplayData } from "./member-display-data";
import { MemberTableRow } from "./member-table-row";
import { MemberDeactivationDialog } from "./components/member-deactivation-dialog";
import {
  type MemberTableRowData,
  useMembersTableColumns,
} from "./use-members-table-columns";

export type MembersTableProps = {
  members: GuildMember[];
  guildOwnerId: string | undefined;
  activityStatsByDiscordIdAndSource: MemberActivityStatsByDiscordId;
  scrollElement: HTMLDivElement | null;
  isMobile: boolean;
  canManageMembers: boolean;
  memberGamePresenceByDiscordId: Parameters<typeof isMemberOnlineInGame>[0];
  memberWebPresenceByDiscordId: MemberWebPresenceByDiscordId | undefined;
  guildId: string;
};

const RIGHT_ALIGNED_COLUMN_IDS = new Set(["visits", "actions"]);

// The mobile list is not a table, so it builds no row model.
const NO_TABLE_ROWS: MemberTableRowData[] = [];

export const MembersTable = ({
  members,
  guildOwnerId,
  activityStatsByDiscordIdAndSource,
  scrollElement,
  isMobile,
  canManageMembers,
  memberGamePresenceByDiscordId,
  memberWebPresenceByDiscordId,
  guildId,
}: MembersTableProps) => {
  "use no memo"; // Reads a virtualizer that mutates in place; see usePageVirtualizer.

  const { t } = useTranslation();
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);

  const [deactivationTarget, setDeactivationTarget] = useState<{
    guildId: string;
    member: GuildMember;
  } | null>(null);

  const openMemberDetails = (member: GuildMember) => {
    navigate({
      to: "/$guildId/settings/members/$memberId",
      params: { guildId, memberId: String(member.id) },
    });
  };

  const columns = useMembersTableColumns({
    guildId,
    guildOwnerId,
    canManageMembers,
    openMemberDetails,
    onDeactivateMember: (member) => setDeactivationTarget({ guildId, member }),
  });

  const tableData = isMobile
    ? NO_TABLE_ROWS
    : members.map((member) => ({
        member,
        displayData: getMemberDisplayData(member, {
          activityStatsByDiscordIdAndSource,
          memberGamePresenceByDiscordId,
          memberWebPresenceByDiscordId,
        }),
      }));

  const table = useTable({
    features: coreTableFeatures,
    data: tableData,
    columns,
    getRowId: ({ member }) => String(member.id),
  });

  const rows = table.getRowModel().rows;

  const rowEstimateSize = isMobile ? 88 : 64;

  const rowVirtualizer = usePageVirtualizer<HTMLElement>({
    count: members.length,
    scrollElement,
    getItemKey: (index) => members[index]?.id ?? `member-${index}`,
    estimateSize: () => rowEstimateSize,
    overscan: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const { top: topPadding, bottom: bottomPadding } = getVirtualListPadding(
    virtualRows,
    rowVirtualizer.getTotalSize(),
    rowVirtualizer.options.scrollMargin,
  );

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
                    <MemberPresenceBadges
                      onlineSources={onlineSources}
                      isGamePresenceVerified={isGamePresenceVerified}
                    />
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
    <>
      <Table ref={tableRef} tabIndex={-1} className="min-w-[994px] table-fixed">
        <colgroup>
          <col className="w-[360px]" />
          <col className="w-[130px]" />
          <col className="w-[160px]" />
          <col className="w-[150px]" />
          <col className="w-[130px]" />
          <col className="w-16" />
        </colgroup>
        <TanStackTableHeader
          table={table}
          className="sticky top-0 z-10 bg-background"
          rowClassName="border-b-1! border-border"
          getHeadClassName={(header) =>
            RIGHT_ALIGNED_COLUMN_IDS.has(header.column.id) ? "text-right" : ""
          }
        />
        <TableBody>
          {topPadding > 0 && (
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                style={{ height: topPadding }}
              />
            </TableRow>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];

            if (!row) return null;

            return (
              <MemberTableRow
                key={virtualRow.key}
                row={row}
                isLastMember={virtualRow.index === rows.length - 1}
                openMemberDetails={openMemberDetails}
              />
            );
          })}
          {bottomPadding > 0 && (
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                style={{ height: bottomPadding }}
              />
            </TableRow>
          )}
        </TableBody>
      </Table>
      {canManageMembers && deactivationTarget && (
        <MemberDeactivationDialog
          guildId={deactivationTarget.guildId}
          member={deactivationTarget.member}
          onClose={() => setDeactivationTarget(null)}
          finalFocus={() =>
            tableRef.current?.querySelector<HTMLElement>(
              `[data-member-id="${deactivationTarget.member.id}"]`,
            ) ?? tableRef.current
          }
        />
      )}
    </>
  );
};
