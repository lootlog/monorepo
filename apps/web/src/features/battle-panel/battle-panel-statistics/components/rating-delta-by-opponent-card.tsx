import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { PlayerTile } from "@/components/battle";
import { StatCard } from "./stat-card";
import { getProfessionName } from "@/lib/utils/professions";
import { Button } from "@lootlog/ui/components/button";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useBattleFiltersStore } from "@/store/battle-filters.store";
import type { RatingDeltaByOpponentRecord } from "@/hooks/api/battle-log/use-rating-delta-by-opponent";

interface RatingDeltaByOpponentCardProps {
  data: RatingDeltaByOpponentRecord[];
  isLoading?: boolean;
}

export function RatingDeltaByOpponentCard({
  data,
  isLoading,
}: RatingDeltaByOpponentCardProps) {
  const navigate = useNavigate();
  const topData = data.slice(0, 5);
  const currentCharacterId = useBattleFiltersStore(
    (state) => state.currentCharacterId,
  );

  const handleRowClick = (opponentId: string) => {
    if (!currentCharacterId) return;
    navigate({
      to: ROUTES.user.battlePanel.playerVsPlayer(
        currentCharacterId,
        opponentId,
      ),
    });
  };

  const columns: ColumnDef<RatingDeltaByOpponentRecord>[] = [
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
      header: "Nazwa",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.opponentName}</span>
      ),
    },
    {
      accessorKey: "opponentLvl",
      header: () => <div className="text-center">Poziom</div>,
      cell: ({ row }) => (
        <div className="text-center">{row.original.opponentLvl}</div>
      ),
    },
    {
      accessorKey: "opponentProf",
      header: () => <div className="text-center">Profesja</div>,
      cell: ({ row }) => (
        <div className="text-center">
          {getProfessionName(row.original.opponentProf)}
        </div>
      ),
    },
    {
      id: "record",
      header: () => <div className="text-center">W - L</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-green-600 font-medium">
            {row.original.wins}
          </span>
          &nbsp;-&nbsp;
          <span className="text-red-600 font-medium">
            {row.original.losses}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "totalRatingDelta",
      header: () => <div className="text-center">Σ Rating</div>,
      cell: ({ row }) => {
        const delta = row.original.totalRatingDelta;
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
      header: () => <div className="text-center">Śr. Rating</div>,
      cell: ({ row }) => {
        const delta = row.original.avgRatingDelta;
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
  ];

  const table = useReactTable({
    data: topData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <StatCard
      title="Bilans walk w Otchłani"
      description="Największe zmiany ratingu według przeciwników (top 5)"
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Brak danych o walkach w Otchłani"
      className="flex flex-col"
    >
      <div className="min-h-72 flex flex-col flex-1">
        <div className="overflow-auto bg-muted/30 rounded-lg">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row.original.opponentId)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end pt-4 mt-auto">
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.user.battlePanel.matchmakingH2h}>
              Zobacz pełny bilans Otchłani
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </StatCard>
  );
}
