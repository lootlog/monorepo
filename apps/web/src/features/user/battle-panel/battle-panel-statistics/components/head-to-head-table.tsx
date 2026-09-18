import { getOpponentSummaryColumns } from "./opponent-summary-columns";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { OpponentSummaryTable } from "./opponent-summary-table";
import { StatCard } from "./stat-card";
import { Button } from "@lootlog/ui/components/button";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { cn } from "cn";
import { coreTableFeatures } from "@/lib/tanstack-table-features";

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

  const handleOpponentOpen = (opponentId: string) => {
    if (!search.characterId) return;

    void navigate({
      to: "/@me/battle-panel/statistics/player-vs-player/$myId/$opponentId",
      params: { myId: search.characterId, opponentId },
      search,
    });
  };

  const columns: ColumnDef<typeof coreTableFeatures, HeadToHeadRecord>[] = [
    ...getOpponentSummaryColumns<HeadToHeadRecord>(t),
    {
      accessorKey: "winRate",
      header: () => (
        <div className="text-right">
          {t("battlePanel.statistics.columns.winRate")}
        </div>
      ),
      cell: ({ row }) => (
        <div
          className={cn(
            "text-right font-medium tabular-nums",
            row.original.winRate >= 50
              ? BATTLE_TEXT_COLORS.result.won
              : BATTLE_TEXT_COLORS.result.lost,
          )}
        >
          {row.original.winRate.toFixed(1)}%
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
        <div className="text-right text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.lastBattleDate), {
            addSuffix: true,
            locale: pl,
          })}
        </div>
      ),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data,
    columns,
  });

  return (
    <StatCard
      title={t("battlePanel.statistics.directMatchups.title")}
      description={t("battlePanel.statistics.directMatchups.description")}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage={t("battlePanel.statistics.directMatchups.emptyTitle")}
      actions={
        <Button
          variant="outline"
          size="sm"
          render={
            <Link to={ROUTES.user.battlePanel.h2h} search={search}>
              {t("battlePanel.statistics.directMatchups.link")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
          nativeButton={false}
        />
      }
    >
      <OpponentSummaryTable table={table} onOpponentOpen={handleOpponentOpen} />
    </StatCard>
  );
}
