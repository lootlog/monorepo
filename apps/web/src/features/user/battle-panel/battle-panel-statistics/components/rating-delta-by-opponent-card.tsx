import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
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
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import type { KeyboardEvent } from "react";
import { cn } from "@lootlog/ui/lib/utils";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";

type RatingDeltaByOpponentCardSearch = {
  characterId?: string;
  period?: Period;
  minLevel: number;
  maxLevel: number;
  startDate?: string;
  endDate?: string;
  matchmaking?: boolean;
};

interface RatingDeltaByOpponentCardProps {
  data: RatingDeltaByOpponentRecord[];
  search: RatingDeltaByOpponentCardSearch;
  isLoading?: boolean;
}

const getRatingDeltaClassName = (delta: number) =>
  cn(
    "font-medium",
    delta >= 0 ? BATTLE_TEXT_COLORS.result.won : BATTLE_TEXT_COLORS.result.lost,
  );

const formatSignedRating = (delta: number, fractionDigits = 0) => {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(fractionDigits)}`;
};

export function RatingDeltaByOpponentCard({
  data,
  search,
  isLoading,
}: RatingDeltaByOpponentCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
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
    if (event.key !== "Enter" && event.key !== "") {
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
    {
      accessorKey: "totalRatingDelta",
      header: () => (
        <div className="text-center">
          {t("battlePanel.statistics.columns.totalRatingDelta")}
        </div>
      ),
      cell: ({ row }) => {
        const delta = row.original.totalRatingDelta;
        return (
          <div className="text-center">
            <span className={getRatingDeltaClassName(delta)}>
              {formatSignedRating(delta)}
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
        return (
          <div className="text-center">
            <span className={getRatingDeltaClassName(delta)}>
              {formatSignedRating(delta, 2)}
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
        {isMobile ? (
          <div className="grid min-w-0 gap-2">
            {topData.map((opponent) => (
              <button
                key={opponent.opponentId}
                type="button"
                onClick={() => handleRowClick(opponent.opponentId)}
                className="min-w-0 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PlayerTile
                    player={{
                      name: opponent.opponentName,
                      lvl: opponent.opponentLvl,
                      prof: opponent.opponentProf,
                      icon: opponent.opponentIcon,
                    }}
                    className="shrink-0 scale-75"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {opponent.opponentName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t("battlePanel.statistics.columns.level")}:{" "}
                      {opponent.opponentLvl} /{" "}
                      {t("battlePanel.statistics.columns.profession")}:{" "}
                      {getProfessionName(opponent.opponentProf)}
                    </div>
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="min-w-0 rounded-md bg-background p-2">
                    <div className="truncate text-muted-foreground">
                      {t("battlePanel.statistics.columns.winLoss")}
                    </div>
                    <div className="mt-1 whitespace-nowrap">
                      <span
                        className={cn(
                          "font-medium",
                          BATTLE_TEXT_COLORS.result.won,
                        )}
                      >
                        {opponent.wins}
                      </span>
                      &nbsp;-&nbsp;
                      <span
                        className={cn(
                          "font-medium",
                          BATTLE_TEXT_COLORS.result.lost,
                        )}
                      >
                        {opponent.losses}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 rounded-md bg-background p-2">
                    <div className="truncate text-muted-foreground">
                      {t("battlePanel.statistics.columns.totalRatingDelta")}
                    </div>
                    <div
                      className={cn(
                        "mt-1 truncate",
                        getRatingDeltaClassName(opponent.totalRatingDelta),
                      )}
                    >
                      {formatSignedRating(opponent.totalRatingDelta)}
                    </div>
                  </div>
                  <div className="min-w-0 rounded-md bg-background p-2">
                    <div className="truncate text-muted-foreground">
                      {t("battlePanel.statistics.columns.avgRating")}
                    </div>
                    <div
                      className={cn(
                        "mt-1 truncate",
                        getRatingDeltaClassName(opponent.avgRatingDelta),
                      )}
                    >
                      {formatSignedRating(opponent.avgRatingDelta, 2)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <ScrollArea className="min-w-0 rounded-lg border border-border bg-card">
            <Table className="border-b">
              <TanStackTableHeader
                table={table}
                className="bg-background/80"
                rowClassName="border-b-1! border-border"
                headClassName="whitespace-nowrap"
              />
              <TanStackTableBody
                table={table}
                cellClassName="whitespace-nowrap"
                getRowProps={(row) => ({
                  onClick: () => handleRowClick(row.original.opponentId),
                  onKeyDown: (event) =>
                    handleRowKeyDown(event, row.original.opponentId),
                  role: "link",
                  tabIndex: 0,
                  className:
                    "cursor-pointer border-b border-border bg-background transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                })}
              />
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
        <div className="mt-auto flex justify-end pt-4">
          <Button
            variant="outline"
            size="sm"
            render={
              <Link to={ROUTES.user.battlePanel.matchmakingH2h} search={search}>
                {t("battlePanel.statistics.matchmaking.link")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            }
            nativeButton={false}
          />
        </div>
      </div>
    </StatCard>
  );
}
