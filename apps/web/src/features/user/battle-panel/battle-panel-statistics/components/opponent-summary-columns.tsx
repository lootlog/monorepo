import type { ColumnDef } from "@tanstack/react-table";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { PlayerTile } from "@/components/tiles/player-tile";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";

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
    accessorKey: "opponentName",
    header: t("battlePanel.statistics.columns.opponent"),
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative h-9 w-6 shrink-0">
          <PlayerTile
            player={{
              name: row.original.opponentName,
              lvl: row.original.opponentLvl,
              prof: row.original.opponentProf,
              icon: row.original.opponentIcon,
            }}
            className="absolute left-0 top-0 origin-top-left scale-75"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
          <span className="truncate text-[13px] font-medium">
            {row.original.opponentName}
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {row.original.opponentLvl}
            {row.original.opponentProf}
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "record",
    header: () => (
      <div className="text-right">
        {t("battlePanel.statistics.columns.winLoss")}
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        <span className={BATTLE_TEXT_COLORS.result.won}>
          {row.original.wins}
        </span>
        <span className="px-1 text-muted-foreground">–</span>
        <span className={BATTLE_TEXT_COLORS.result.lost}>
          {row.original.losses}
        </span>
      </div>
    ),
  },
];
