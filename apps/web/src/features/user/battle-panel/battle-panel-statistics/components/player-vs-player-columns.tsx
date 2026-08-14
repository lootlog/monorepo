import i18n from "@/i18n/config";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { getPlayerVsPlayerBattleResult } from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattlePanelPvpWarriorSummary } from "@/features/user/battle-panel/components/battle-panel-pvp-warrior-summary";
import { BattleResultStatus } from "@/features/user/battle-panel/components/battle-result-status";
import type { PlayerVsPlayerBattle } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export const playerVsPlayerColumns: ColumnDef<PlayerVsPlayerBattle>[] = [
  {
    id: "result",
    header: () => (
      <div className="text-center">
        {i18n.t("battlePanel.statistics.columns.result")}
      </div>
    ),
    cell: ({ row }) => {
      return (
        <div className="flex justify-center">
          <BattleResultStatus
            result={getPlayerVsPlayerBattleResult(row.original)}
          />
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "userWarrior",
    header: i18n.t("battlePanel.list.columns.yourTeam"),
    cell: ({ row }) => (
      <BattlePanelPvpWarriorSummary
        warrior={row.original.userWarrior}
        opposingWarrior={row.original.opponentWarrior}
        className="max-w-[280px]"
      />
    ),
    enableSorting: false,
  },
  {
    id: "opponentWarrior",
    header: i18n.t("battlePanel.list.columns.opponents"),
    cell: ({ row }) => (
      <BattlePanelPvpWarriorSummary
        warrior={row.original.opponentWarrior}
        opposingWarrior={row.original.userWarrior}
        className="max-w-[280px]"
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "ratingDelta",
    header: () => (
      <div className="text-center">
        {i18n.t("battlePanel.statistics.columns.ratingDelta")}
      </div>
    ),
    cell: ({ row }) => {
      const delta = row.original.ratingDelta;

      if (delta === null) {
        return (
          <div className="text-center text-muted-foreground">
            {i18n.t("battlePanel.single.recentOpponent.noRating")}
          </div>
        );
      }

      const sign = delta >= 0 ? "+" : "";

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
            {sign}
            {delta}
          </span>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "userRating",
    header: () => (
      <div className="text-center">
        {i18n.t("battlePanel.statistics.columns.yourRating")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.original.userRating ??
          i18n.t("battlePanel.single.recentOpponent.noRating")}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentRating",
    header: () => (
      <div className="text-center">
        {i18n.t("battlePanel.statistics.columns.opponentRating")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.original.opponentRating ??
          i18n.t("battlePanel.single.recentOpponent.noRating")}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "duration",
    header: () => (
      <div className="text-center">
        {i18n.t("battlePanel.statistics.columns.duration")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">{Math.floor(row.original.duration)}s</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "createdAt",
    header: () => (
      <div className="text-right">
        {i18n.t("battlePanel.statistics.columns.date")}
      </div>
    ),
    cell: ({ row }) => {
      const exactTime = format(
        new Date(row.original.createdAt),
        "dd.MM.yyyy HH:mm",
      );

      return (
        <div className="flex min-w-0 justify-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="max-w-full truncate text-xs font-medium text-muted-foreground">
                  {getRelativeTime(row.original.createdAt)}
                </span>
              }
            />
            <TooltipContent>{exactTime}</TooltipContent>
          </Tooltip>
        </div>
      );
    },
    enableSorting: false,
  },
];
