import type { TFunction } from "i18next";
import type { ColumnDef } from "@tanstack/react-table";
import type { KillHistoryMemberEntry } from "@lootlog/client/main";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { KillMonsterCell } from "../kills/kill-monster-cell";
import { createKillNumberColumn } from "../kills/event-kills-table-columns";
import { getMemberKillScoringViewModel } from "./member-kills-view-model";
import { MemberKillBreakdownToggle } from "./member-kill-breakdown-toggle";
import { MemberKillPoints } from "./member-kill-points";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";

type CreateMemberKillsTableColumnsOptions = {
  eventId: string;
  expandedKillIds: readonly string[];
  guildId: string;
  onExpandedToggle: (killId: string) => void;
  t: TFunction;
};

export const createMemberKillsTableColumns = ({
  eventId,
  expandedKillIds,
  guildId,
  onExpandedToggle,
  t,
}: CreateMemberKillsTableColumnsOptions): ColumnDef<
  typeof coreTableFeatures,
  KillHistoryMemberEntry
>[] => [
  createKillNumberColumn<KillHistoryMemberEntry>(t),
  {
    id: "monster",
    header: t("events.kills.monster"),
    cell: ({ row }) => (
      <KillMonsterCell
        eventId={eventId}
        guildId={guildId}
        kill={row.original}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "killedAt",
    id: "date",
    header: t("events.kills.date"),
    cell: ({ row }) => (
      <div className="text-xs tabular-nums sm:text-sm">
        {timestampToDate(row.original.killedAt)}
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "timeCoverage",
    header: t("events.kills.timeCoverage"),
    cell: ({ row }) =>
      getMemberKillScoringViewModel(row.original, t).trackingPercentage,
    enableSorting: false,
  },
  {
    id: "trackingTime",
    header: t("events.kills.trackingDurationTime"),
    cell: ({ row }) =>
      getMemberKillScoringViewModel(row.original, t).trackingTime,
    enableSorting: false,
  },
  {
    id: "points",
    header: t("events.kills.points"),
    cell: ({ row }) => <MemberKillPoints kill={row.original} />,
    enableSorting: false,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">{t("events.kills.actions")}</span>,
    cell: ({ row }) => (
      <MemberKillBreakdownToggle
        monsterName={row.original.heroNpc.npcName}
        isExpanded={expandedKillIds.includes(row.original.id)}
        onToggle={() => onExpandedToggle(row.original.id)}
      />
    ),
    enableSorting: false,
  },
];
