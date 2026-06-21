import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@lootlog/ui/components/button";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { BattlePanelH2hOpponentSummary } from "@/features/user/battle-panel/components/battle-panel-h2h-opponent-summary";
import { BattleResultStatus } from "@/features/user/battle-panel/components/battle-result-status";
import type { HeadToHeadRecord } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import i18n from "@/i18n/config";

export const headToHeadColumns: ColumnDef<HeadToHeadRecord>[] = [
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
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("battlePanel.filters.results.won")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
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
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("battlePanel.filters.results.lost")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
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
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("battlePanel.statistics.columns.total")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.totalBattles}</div>
    ),
  },
  {
    accessorKey: "winRate",
    header: ({ column }) => (
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("battlePanel.statistics.columns.winRate")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
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
  {
    accessorKey: "lastBattleDate",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("battlePanel.statistics.columns.lastBattle")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const exactTime = format(
        new Date(row.original.lastBattleDate),
        "dd.MM.yyyy HH:mm",
      );

      return (
        <div className="flex min-w-0 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-full truncate text-xs font-medium text-muted-foreground">
                {getRelativeTime(row.original.lastBattleDate)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{exactTime}</TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
];
