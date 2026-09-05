import type { ColumnDef } from "@tanstack/react-table";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { PlayerTile } from "@/components/battle";
import { getProfessionName } from "@/lib/utils/professions";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { cn } from "cn";

type OpponentSummary = {
  opponentName: string;
  opponentLvl: number;
  opponentProf: string;
  opponentIcon: string;
  wins: number;
  losses: number;
};
export const getOpponentSummaryColumns = <Record extends OpponentSummary>(
  t: (key: string) => string,
): ColumnDef<typeof coreTableFeatures, Record>[] => [
  {
    id: "avatar",
    header: "",
    cell: ({ row }) => (
      <PlayerTile
        player={{
          name: row.original.opponentName,
          lvl: row.original.opponentLvl,
          prof: row.original.opponentProf,
          icon: row.original.opponentIcon,
        }}
        className="scale-75"
      />
    ),
  },
  {
    accessorKey: "opponentName",
    header: t("battlePanel.statistics.columns.name"),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.opponentName}</span>
    ),
  },
  {
    accessorKey: "opponentLvl",
    header: () => (
      <div className="text-center">
        {t("battlePanel.statistics.columns.level")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">{row.original.opponentLvl}</div>
    ),
  },
  {
    accessorKey: "opponentProf",
    header: () => (
      <div className="text-center">
        {t("battlePanel.statistics.columns.profession")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {getProfessionName(row.original.opponentProf)}
      </div>
    ),
  },
  {
    id: "record",
    header: () => (
      <div className="text-center">
        {t("battlePanel.statistics.columns.winLoss")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className={cn("font-medium", BATTLE_TEXT_COLORS.result.won)}>
          {row.original.wins}
        </span>
        &nbsp;-&nbsp;
        <span className={cn("font-medium", BATTLE_TEXT_COLORS.result.lost)}>
          {row.original.losses}
        </span>
      </div>
    ),
  },
];
