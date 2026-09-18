import { getOpponentSummaryColumns } from "./opponent-summary-columns";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import { OpponentSummaryTable } from "./opponent-summary-table";
import { StatCard } from "./stat-card";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { ROUTES } from "@/config/routes";
import type { RatingDeltaByOpponentRecord } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { cn } from "cn";
import { coreTableFeatures } from "@/lib/tanstack-table-features";

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
    "text-right font-medium tabular-nums",
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
  const topData = data.slice(0, 5);

  const handleOpponentOpen = (opponentId: string) => {
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

  const columns: ColumnDef<
    typeof coreTableFeatures,
    RatingDeltaByOpponentRecord
  >[] = [
    ...getOpponentSummaryColumns<RatingDeltaByOpponentRecord>(t),
    {
      accessorKey: "totalRatingDelta",
      header: () => (
        <div className="text-right">
          {t("battlePanel.statistics.columns.totalRatingDelta")}
        </div>
      ),
      cell: ({ row }) => (
        <div className={getRatingDeltaClassName(row.original.totalRatingDelta)}>
          {formatSignedRating(row.original.totalRatingDelta)}
        </div>
      ),
    },
    {
      accessorKey: "avgRatingDelta",
      header: () => (
        <div className="text-right">
          {t("battlePanel.statistics.columns.avgRating")}
        </div>
      ),
      cell: ({ row }) => (
        <div className={getRatingDeltaClassName(row.original.avgRatingDelta)}>
          {formatSignedRating(row.original.avgRatingDelta, 2)}
        </div>
      ),
    },
  ];

  const table = useTable({
    features: coreTableFeatures,
    data: topData,
    columns,
  });

  return (
    <StatCard
      title={t("battlePanel.statistics.matchmaking.title")}
      description={t("battlePanel.statistics.matchmaking.description")}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage={t("battlePanel.statistics.matchmaking.empty")}
      actions={
        <ChevronLink
          className="inline-flex h-8 shrink-0 items-center gap-1 text-xs"
          render=<Link
            to={ROUTES.user.battlePanel.matchmakingH2h}
            search={search}
          />
        >
          {t("battlePanel.statistics.matchmaking.link")}
        </ChevronLink>
      }
    >
      <OpponentSummaryTable table={table} onOpponentOpen={handleOpponentOpen} />
    </StatCard>
  );
}
