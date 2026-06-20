import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { PlayerTile } from "@/components/battle";
import { StatCard } from "./stat-card";
import { getProfessionName } from "@/lib/utils/professions";
import { Button } from "@lootlog/ui/components/button";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/config/routes";
import type { RatingDeltaByOpponentRecord } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Period } from "@/store/battle-filters.store";
import type { KeyboardEvent } from "react";

type RatingDeltaByOpponentCardSearch = {
  characterId?: string;
  period: Period;
  minLevel: number;
  maxLevel: number;
};

interface RatingDeltaByOpponentCardProps {
  data: RatingDeltaByOpponentRecord[];
  search: RatingDeltaByOpponentCardSearch;
  isLoading?: boolean;
}

export function RatingDeltaByOpponentCard({
  data,
  search,
  isLoading,
}: RatingDeltaByOpponentCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const topData = data.slice(0, 5);

  const handleRowClick = (opponentId: string) => {
    if (!search.characterId) return;

    void navigate({
      to: "/@me/battle-panel/statistics/player-vs-player/$myId/$opponentId",
      params: {
        myId: search.characterId,
        opponentId,
      },
      search,
    });
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    opponentId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleRowClick(opponentId);
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
      accessorKey: "totalRatingDelta",
      header: () => (
        <div className="text-center">
          {t("battlePanel.statistics.columns.totalRatingDelta")}
        </div>
      ),
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
      header: () => (
        <div className="text-center">
          {t("battlePanel.statistics.columns.avgRating")}
        </div>
      ),
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
      title={t("battlePanel.statistics.matchmaking.title")}
      description={t("battlePanel.statistics.matchmaking.description")}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage={t("battlePanel.statistics.matchmaking.empty")}
      className="flex flex-col"
    >
      <div className="flex min-h-72 min-w-0 flex-1 flex-col">
        <ScrollArea className="min-w-0 rounded-lg bg-muted/30">
          <Table>
            <TanStackTableHeader table={table} />
            <TanStackTableBody
              table={table}
              getRowProps={(row) => ({
                onClick: () => handleRowClick(row.original.opponentId),
                onKeyDown: (event) =>
                  handleRowKeyDown(event, row.original.opponentId),
                role: "link",
                tabIndex: 0,
                className:
                  "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              })}
            />
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="flex justify-end pt-4 mt-auto">
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.user.battlePanel.matchmakingH2h} search={search}>
              {t("battlePanel.statistics.matchmaking.link")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </StatCard>
  );
}
