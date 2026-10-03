import type { ColumnDef } from "@tanstack/react-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { cn } from "cn";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import i18n from "@/i18n/config";
import type { HeadToHeadRecord } from "@/lib/api/battlelog-types";
import {
  headToHeadBaseColumns,
  headToHeadLastBattleColumn,
} from "./head-to-head-columns";
import type { sortingTableFeatures } from "@/lib/tanstack-table-features";

const matchmakingRatingColumns: ColumnDef<
  typeof sortingTableFeatures,
  HeadToHeadRecord
>[] = [
  {
    accessorKey: "totalRatingDelta",
    header: ({ column }) => (
      <SortableColumnHeader column={column}>
        {i18n.t("battlePanel.statistics.columns.totalRatingDelta")}
      </SortableColumnHeader>
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
      <SortableColumnHeader column={column}>
        {i18n.t("battlePanel.statistics.columns.avgRating")}
      </SortableColumnHeader>
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

export const matchmakingH2HColumns: ColumnDef<
  typeof sortingTableFeatures,
  HeadToHeadRecord
>[] = [
  ...headToHeadBaseColumns,
  ...matchmakingRatingColumns,
  headToHeadLastBattleColumn,
];
