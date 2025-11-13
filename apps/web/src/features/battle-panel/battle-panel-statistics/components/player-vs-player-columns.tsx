import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";
import { getProfessionName } from "@/lib/utils/professions";
import { cn } from "@lootlog/ui/lib/utils";
import type { PlayerVsPlayerBattle } from "@/hooks/api/battle-log/use-player-vs-player";

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
    header: "Nick",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.opponentWarrior.name}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentWarrior.lvl",
    header: () => <div className="text-center">Poziom</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.original.opponentWarrior.lvl}</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentWarrior.prof",
    header: () => <div className="text-center">Profesja</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {getProfessionName(row.original.opponentWarrior.prof)}
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "result",
    header: () => <div className="text-center">Wynik</div>,
    cell: ({ row }) => {
      const isWin = row.original.userWarrior.name === row.original.winner;
      return (
        <div className="text-center">
          <span
            className={cn(
              "font-bold",
              isWin ? "text-green-600" : "text-red-600",
            )}
          >
            {isWin ? "W" : "L"}
          </span>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "ratingDelta",
    header: () => <div className="text-center">Rating Δ</div>,
    cell: ({ row }) => {
      const delta = row.original.ratingDelta;
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
    header: () => <div className="text-center">Twój Rating</div>,
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.userRating}</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "opponentRating",
    header: () => <div className="text-center">Rating przeciwnika</div>,
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.original.opponentRating}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "duration",
    header: () => <div className="text-center">Czas trwania</div>,
    cell: ({ row }) => (
      <div className="text-center">{Math.floor(row.original.duration)}s</div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="text-right">Data</div>,
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
