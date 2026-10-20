import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "usehooks-ts";
import { AlertCircle, Trophy } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { ResultsSurface } from "@/components/common/results-surface";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Button } from "@lootlog/ui/components/button";
import { getFactionWarFactionArt } from "./faction-war-art";
import { FactionWarLeaderboardTable } from "./faction-war-leaderboard-table";
import { FactionWarLeaderboardTiles } from "./faction-war-leaderboard-tiles";
import {
  useFactionWarLeaderboard,
  type FactionWar,
} from "./faction-war-queries";
import { FACTION_WAR_SIDES } from "./faction-war-standings";

const isFaction = (value: string): value is FactionWarFaction =>
  FACTION_WAR_SIDES.some((faction) => faction === value);

/** Each faction's top players, the caller's own place among them. */
export const FactionWarRankingResults = ({ war }: { war: FactionWar }) => {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<FactionWarFaction>();
  const faction = chosen ?? war.pick?.faction ?? FACTION_WAR_SIDES[0];
  const leaderboard = useFactionWarLeaderboard(war, faction);
  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  const renderResults = () => {
    if (leaderboard.isPending) {
      return (
        <div aria-busy="true">
          <TableRowsSkeleton
            withHeader
            rowContent="text"
            trailingColumns={2}
            mobileList={
              <CardListSkeleton card={<ListTileSkeleton media="none" />} />
            }
          />
        </div>
      );
    }

    if (leaderboard.isError) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={AlertCircle}
            title={t("factionWar.ranking.error")}
            action={
              <Button
                variant="outline"
                loading={leaderboard.isFetching}
                onClick={() => void leaderboard.refetch()}
              >
                {t("common.actions.retry")}
              </Button>
            }
          />
        </div>
      );
    }

    if (leaderboard.data.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={Trophy}
            title={t("factionWar.ranking.empty", {
              faction: t(`factionWar.factionsGenitive.${faction}`),
            })}
          />
        </div>
      );
    }

    return usesTable ? (
      <FactionWarLeaderboardTable entries={leaderboard.data} />
    ) : (
      <FactionWarLeaderboardTiles entries={leaderboard.data} />
    );
  };

  return (
    <ResultsSurface
      search={
        // The factions lead the bar, as view tabs, where a search would sit.
        <Tabs
          value={faction}
          onValueChange={(value: string) => {
            if (isFaction(value)) setChosen(value);
          }}
          className="min-w-0 flex-1"
        >
          <TabsList aria-label={t("factionWar.ranking.factionLabel")} size="lg">
            {FACTION_WAR_SIDES.map((side) => (
              <TabsTrigger key={side} value={side}>
                <img
                  src={getFactionWarFactionArt(war.id, side).emblem}
                  alt=""
                  width={256}
                  height={256}
                  className="size-5"
                />
                {t(`factionWar.factions.${side}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
      filtersLabel={t("factionWar.ranking.factionLabel")}
    >
      {renderResults()}
    </ResultsSurface>
  );
};
