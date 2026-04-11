import { useMemo } from "react";
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
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";
import { StatCard } from "./stat-card";
import { getProfessionName } from "@/lib/utils/professions";
import { Button } from "@lootlog/ui/components/button";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "react-i18next";

type HeadToHeadTableSearch = {
  characterId?: string;
  period: string;
  minLevel: number;
  maxLevel: number;
  ph?: boolean;
  matchmaking?: boolean;
};

interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  opponentIcon: string;
  opponentProf: string;
  opponentLvl: number;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  lastBattleDate: string;
}

interface HeadToHeadTableProps {
  data: HeadToHeadRecord[];
  search: HeadToHeadTableSearch;
  isLoading?: boolean;
}

export function HeadToHeadTable({
  data,
  search,
  isLoading,
}: HeadToHeadTableProps) {
  const { t } = useTranslation();
  const columns: ColumnDef<HeadToHeadRecord>[] = useMemo(
    () => [
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
        accessorKey: "winRate",
        header: () => (
          <div className="text-center">
            {t("battlePanel.statistics.columns.winRate")}
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
        accessorKey: "lastBattleDate",
        header: () => (
          <div className="text-right">
            {t("battlePanel.statistics.columns.lastBattle")}
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
    ],
    [t],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <StatCard
      title={t("battlePanel.statistics.directMatchups.title")}
      description={t("battlePanel.statistics.directMatchups.description")}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage={t("battlePanel.statistics.battleDuration.empty")}
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
                <TableRow key={row.id}>
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
            <Link to={ROUTES.user.battlePanel.h2h} search={search as never}>
              {t("battlePanel.statistics.directMatchups.link")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </StatCard>
  );
}
