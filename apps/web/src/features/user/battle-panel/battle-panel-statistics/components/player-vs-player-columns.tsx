import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";
import {
  BattleResultStatus,
  type BattleResultStatusValue,
} from "@/features/user/battle-panel/components/battle-result-status";
import { getProfessionName } from "@/lib/utils/professions";
import { cn } from "@lootlog/ui/lib/utils";
import type { PlayerVsPlayerBattle } from "@/lib/api/battlelog-types";
import i18n from "@/i18n/config";

const getPlayerVsPlayerBattleResult = (
  battle: PlayerVsPlayerBattle,
): BattleResultStatusValue => {
  if (battle.hasFlee) {
    return "flee";
  }

  if (battle.userWarrior.name === battle.winner) {
    return "won";
  }

  return "lost";
};

export const playerVsPlayerColumns: ColumnDef<PlayerVsPlayerBattle>[] = [
  {
    id: "avatar",
    header: "",
    cell: ({ row }) => (
      <PlayerTile
        player={{
          name: row.original.opponentWarrior.name,
          lvl: row.original.opponentWarrior.lvl,
          prof: row.original.opponentWarrior.prof,
          icon: row.original.opponentWarrior.icon,
        }}
        className="scale-75"
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentWarrior.name",
    header: i18n.t("battlePanel.statistics.columns.nick"),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.opponentWarrior.name}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentWarrior.lvl",
    header: () => (
      <div className="text-center">
        {i18n.t("battlePanel.statistics.columns.level")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">{row.original.opponentWarrior.lvl}</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentWarrior.prof",
    header: () => (
      <div className="text-center">
        {i18n.t("battlePanel.statistics.columns.profession")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {getProfessionName(row.original.opponentWarrior.prof)}
      </div>
    ),
    enableSorting: false,
  },
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
              delta >= 0 ? "text-green-600" : "text-red-600",
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
    cell: ({ row }) => (
      <div className="text-right text-sm">
        {format(new Date(row.original.createdAt), "HH:mm - dd.MM.yyyy", {
          locale: pl,
        })}
      </div>
    ),
    enableSorting: false,
  },
];
