import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@lootlog/ui/components/button";
import { ArrowUpDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";
import { getProfessionName } from "@/lib/utils/professions";
import type { HeadToHeadRecord } from "@/hooks/api/battle-log/use-head-to-head";

export const matchmakingH2HColumns: ColumnDef<HeadToHeadRecord>[] = [
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
    enableSorting: false,
  },
  {
    accessorKey: "opponentName",
    header: "Nazwa",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.opponentName}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentLvl",
    header: () => <div className="text-center">Poziom</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.original.opponentLvl}</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentProf",
    header: () => <div className="text-center">Profesja</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {getProfessionName(row.original.opponentProf)}
      </div>
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
          Wygrane
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="text-green-600 font-medium">{row.original.wins}</span>
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
          Przegrane
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span className="text-red-600 font-medium">{row.original.losses}</span>
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
          Łącznie
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
          Win %
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <span
          className={
            row.original.winRate >= 50
              ? "text-green-600 font-medium"
              : "text-red-600 font-medium"
          }
        >
          {row.original.winRate.toFixed(1)}%
        </span>
      </div>
    ),
  },
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
          Σ Rating
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const delta = row.original.totalRatingDelta ?? 0;
      const sign = delta >= 0 ? "+" : "";
      return (
        <div className="text-center">
          <span
            className={
              delta >= 0
                ? "text-green-600 font-medium"
                : "text-red-600 font-medium"
            }
          >
            {sign}
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
          Śr. Rating
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const delta = row.original.avgRatingDelta ?? 0;
      const sign = delta >= 0 ? "+" : "";
      return (
        <div className="text-center">
          <span
            className={
              delta >= 0
                ? "text-green-600 font-medium"
                : "text-red-600 font-medium"
            }
          >
            {sign}
            {delta.toFixed(2)}
          </span>
        </div>
      );
    },
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
          Ostatnia walka
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(row.original.lastBattleDate), {
          addSuffix: true,
          locale: pl,
        })}
      </div>
    ),
  },
];
