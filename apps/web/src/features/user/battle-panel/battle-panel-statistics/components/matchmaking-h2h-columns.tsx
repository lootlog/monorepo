import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import i18n from "@/i18n/config";
import type { HeadToHeadRecord } from "@/lib/api/battlelog-types";
import {
  headToHeadBaseColumns,
  headToHeadLastBattleColumn,
} from "./head-to-head-columns";

const matchmakingRatingColumns: ColumnDef<HeadToHeadRecord>[] = [
  {
    accessorKey: "totalRatingDelta",
    header: ({ column }) => (
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("battlePanel.statistics.columns.totalRatingDelta")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const delta = row.original.totalRatingDelta ?? 0;

      return (
        <div className="text-center">
          <span
            className={cn(
              "font-medium",
              delta >= 0
                ? BATTLE_TEXT_COLORS.result.won
                : BATTLE_TEXT_COLORS.result.lost,
            )}
          >
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "avgRatingDelta",
    header: ({ column }) => (
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          {i18n.t("battlePanel.statistics.columns.avgRating")}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const delta = row.original.avgRatingDelta ?? 0;

      return (
        <div className="text-center">
          <span
            className={cn(
              "font-medium",
              delta >= 0
                ? BATTLE_TEXT_COLORS.result.won
                : BATTLE_TEXT_COLORS.result.lost,
            )}
          >
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(2)}
          </span>
        </div>
      );
    },
  },
];

export const matchmakingH2HColumns: ColumnDef<HeadToHeadRecord>[] = [
  ...headToHeadBaseColumns,
  ...matchmakingRatingColumns,
  headToHeadLastBattleColumn,
];
