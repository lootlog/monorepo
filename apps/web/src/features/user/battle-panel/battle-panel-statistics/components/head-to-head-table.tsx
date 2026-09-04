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
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";
import { StatCard } from "./stat-card";
import { getProfessionName } from "@/lib/utils/professions";
import { Button } from "@lootlog/ui/components/button";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import type { KeyboardEvent } from "react";
import { cn } from "cn";

type HeadToHeadTableSearch = {
  characterId?: string;
  period: Period;
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
  const navigate = useNavigate();
  const handleNavigateToHeadToHead = () => {
    void navigate({
      to: ROUTES.user.battlePanel.h2h,
      search,
    });
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key !== "Enter" && event.key !== "") {
      return;
    }

    event.preventDefault();
    handleNavigateToHeadToHead();
  };

  const columns: ColumnDef<HeadToHeadRecord>[] = [
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
      accessorKey: "winRate",
      header: () => (
        <div className="text-center">
          {t("battlePanel.statistics.columns.winRate")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <span
            className={cn(
              "font-medium",
              row.original.winRate >= 50
                ? BATTLE_TEXT_COLORS.result.won
                : BATTLE_TEXT_COLORS.result.lost,
            )}
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
  ];

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
      emptyMessage={t("battlePanel.statistics.directMatchups.emptyTitle")}
      className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleNavigateToHeadToHead}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
      ariaLabel={t("battlePanel.statistics.directMatchups.link")}
    >
      <div className="flex min-h-72 min-w-0 flex-1 flex-col">
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
              rowClassName="border-b border-border bg-background transition-colors hover:bg-muted/50"
              cellClassName="whitespace-nowrap"
            />
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="mt-auto flex justify-end pt-4">
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                to={ROUTES.user.battlePanel.h2h}
                search={search}
                onClick={(event) => event.stopPropagation()}
              >
                {t("battlePanel.statistics.directMatchups.link")}
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
