import type { ColumnDef } from "@tanstack/react-table";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { BattlePanelH2hOpponentSummary } from "@/features/user/battle-panel/components/battle-panel-h2h-opponent-summary";
import { BattleResultStatus } from "@/features/user/battle-panel/components/battle-result-status";
import type { HeadToHeadRecord } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import i18n from "@/i18n/config";
import type { sortingTableFeatures } from "@/lib/tanstack-table-features";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

export const headToHeadBaseColumns: ColumnDef<
  typeof sortingTableFeatures,
  HeadToHeadRecord
>[] = [
  {
    id: "lastBattleResult",
    header: () => (
      <div className="text-center">
        {i18n.t("battlePanel.statistics.columns.result")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <BattleResultStatus result={row.original.lastBattleResult} />
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentName",
    header: i18n.t("battlePanel.statistics.columns.name"),
    cell: ({ row }) => (
      <BattlePanelH2hOpponentSummary
        record={row.original}
        className="max-w-[280px]"
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "wins",
    header: ({ column }) => (
      <SortableColumnHeader column={column}>
        {i18n.t("battlePanel.filters.results.won")}
      </SortableColumnHeader>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={cn("font-medium", BATTLE_TEXT_COLORS.result.won)}>
          {row.original.wins}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "losses",
    header: ({ column }) => (
      <SortableColumnHeader column={column}>
        {i18n.t("battlePanel.filters.results.lost")}
      </SortableColumnHeader>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={cn("font-medium", BATTLE_TEXT_COLORS.result.lost)}>
          {row.original.losses}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "totalBattles",
    header: ({ column }) => (
      <SortableColumnHeader column={column}>
        {i18n.t("battlePanel.statistics.columns.total")}
      </SortableColumnHeader>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.totalBattles}</div>
    ),
  },
  {
    accessorKey: "winRate",
    header: ({ column }) => (
      <SortableColumnHeader column={column}>
        {i18n.t("battlePanel.statistics.columns.winRate")}
      </SortableColumnHeader>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span
          className={cn(
            "font-medium",
            row.original.winRate >= 50
              ? BATTLE_TEXT_COLORS.result.won
              : BATTLE_TEXT_COLORS.result.lost,
          )}
        >
          {row.original.winRate.toFixed(1)}%
        </span>
      </div>
    ),
  },
];

export const headToHeadLastBattleColumn: ColumnDef<
  typeof sortingTableFeatures,
  HeadToHeadRecord
> = {
  accessorKey: "lastBattleDate",
  header: ({ column }) => (
    <SortableColumnHeader column={column} align="end">
      {i18n.t("battlePanel.statistics.columns.lastBattle")}
    </SortableColumnHeader>
  ),
  cell: ({ row }) => {
    const exactTime = timestampToDate(row.original.lastBattleDate);

    return (
      <div className="flex min-w-0 justify-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="max-w-full truncate text-xs font-medium text-muted-foreground">
                {getRelativeTime(row.original.lastBattleDate)}
              </span>
            }
          />
          <TooltipContent>{exactTime}</TooltipContent>
        </Tooltip>
      </div>
    );
  },
};

export const headToHeadColumns: ColumnDef<
  typeof sortingTableFeatures,
  HeadToHeadRecord
>[] = [...headToHeadBaseColumns, headToHeadLastBattleColumn];
