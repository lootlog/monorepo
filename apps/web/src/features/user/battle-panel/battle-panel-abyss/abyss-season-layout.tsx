import { BATTLE_TEXT_COLORS } from "@/components/battle/utils/battle-color-palette";
import {
  formatBattleMetric,
  formatSignedBattleMetric,
} from "@/components/battle/utils/value-utils";
import { DetailBar } from "@/components/common/detail-bar";
import { DetailBarFact } from "@/components/common/detail-bar-fact";
import { DetailBarFacts } from "@/components/common/detail-bar-facts";
import { EmptyState } from "@/components/common/empty-state";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { StatisticsQueryPanel } from "@/features/user/battle-panel/battle-panel-statistics/components/statistics-query-panel";
import { useBattleCharacters } from "@/components/filters/use-battle-characters";
import { ROUTES } from "@/config/routes";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getAbyssSeasonRangeLabel } from "./abyss-formatters";
import { AbyssSeasonTabs, type AbyssSeasonTab } from "./abyss-season-tabs";
import { useAbyssSeason } from "./use-abyss-season";

const formatOptionalNumber = (value: number | null) =>
  value === null ? "–" : formatBattleMetric(value);

const getActiveTab = (pathname: string): AbyssSeasonTab =>
  pathname.endsWith("/opponents")
    ? "opponents"
    : pathname.endsWith("/analytics")
      ? "analytics"
      : "battles";

/**
 * One Abyss season: its totals across the top, then its battles, opponents
 * and analytics as tabs, all in one page scroller so the tabs stay pinned.
 */
export function AbyssSeasonLayout() {
  const { t } = useTranslation();
  const { characterId, season, seasonsQuery } = useAbyssSeason();
  const characters = useBattleCharacters();
  const pathname = useLocation({ select: (location) => location.pathname });
  const character = characters.find((entry) => entry.id === characterId);

  if (!characterId || (seasonsQuery.data && !season)) {
    return (
      <div className="p-3">
        <EmptyState
          fill
          icon={Trophy}
          title={t("battlePanel.abyss.seasonNotFound")}
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to={ROUTES.user.battlePanel.abyss}
                  search={{ characterId }}
                />
              }
            >
              {t("battlePanel.abyss.backToSeasons")}
            </Button>
          }
        />
      </div>
    );
  }

  const fact = (value: ReactNode) =>
    season ? value : <SkeletonLine className="h-3 w-14" />;

  const meta = (
    <DetailBarFacts>
      <DetailBarFact label={t("battlePanel.filters.character")}>
        {character ? (
          <span className="truncate">{character.name}</span>
        ) : (
          <SkeletonLine className="h-3 w-20" />
        )}
      </DetailBarFact>
      <DetailBarFact label={t("battlePanel.abyss.seasonsTable.record")}>
        {fact(
          season && (
            <span>
              <span className={BATTLE_TEXT_COLORS.result.won}>
                {season.wins}
              </span>
              <span className="px-1 text-muted-foreground">–</span>
              <span className={BATTLE_TEXT_COLORS.result.lost}>
                {season.losses}
              </span>
            </span>
          ),
        )}
      </DetailBarFact>
      <DetailBarFact label={t("battlePanel.abyss.seasonsTable.winRate")}>
        {fact(season && `${formatBattleMetric(season.winRate)}%`)}
      </DetailBarFact>
      <DetailBarFact label={t("battlePanel.abyss.seasonsTable.ratingDelta")}>
        {fact(
          season && (
            <span
              className={
                season.totalRatingDelta >= 0
                  ? BATTLE_TEXT_COLORS.result.won
                  : BATTLE_TEXT_COLORS.result.lost
              }
            >
              {formatSignedBattleMetric(season.totalRatingDelta)}
            </span>
          ),
        )}
      </DetailBarFact>
      <DetailBarFact label={t("battlePanel.abyss.seasonsTable.peakRating")}>
        {fact(season && formatOptionalNumber(season.peakRating))}
      </DetailBarFact>
      <DetailBarFact label={t("battlePanel.abyss.seasonsTable.points")}>
        {fact(season && formatOptionalNumber(season.totalPointsGained))}
      </DetailBarFact>
    </DetailBarFacts>
  );

  const title = season
    ? t("battlePanel.abyss.seasonTitle", {
        range: getAbyssSeasonRangeLabel(season),
      })
    : t("battlePanel.abyss.season");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{title}</h1>
      {/* The top bar names the season, so it reads like a document title. */}
      <HeaderSlotPortal slot="title">
        <span
          aria-current="page"
          className="flex h-8 min-w-0 items-center px-2 text-sm font-semibold"
        >
          <span className="truncate">{title}</span>
        </span>
      </HeaderSlotPortal>
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <StatisticsQueryPanel query={seasonsQuery}>
          <DetailBar meta={meta} />
        </StatisticsQueryPanel>
        <AbyssSeasonTabs
          seasonId={season?.id ?? ""}
          characterId={characterId}
          activeId={getActiveTab(pathname)}
        />
        {season && <Outlet />}
      </ScrollArea>
    </div>
  );
}
