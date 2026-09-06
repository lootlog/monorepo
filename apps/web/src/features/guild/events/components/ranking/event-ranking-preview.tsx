import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import type { EventRanking, EventHeroNpc } from "../../types/api";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useState } from "react";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";
import { EventRankingTable } from "./event-ranking-table";

interface EventRankingPreviewProps {
  rankings: EventRanking[];
  heroNpcs: EventHeroNpc[];
  guildId: string;
  eventId: string;
  limit?: number;
}

export const EventRankingPreview = ({
  rankings,
  heroNpcs,
  guildId,
  eventId,
  limit = 5,
}: EventRankingPreviewProps) => {
  const { t } = useTranslation();
  const [selectedHeroName, setSelectedHeroName] = useState<string | null>(null);

  const heroNamesWithRankings = new Set(
    rankings.map((ranking) => ranking.heroNpcName),
  );
  const firstHeroWithRankings = heroNpcs.find((hero) =>
    heroNamesWithRankings.has(hero.npcName),
  );
  const defaultHeroName =
    firstHeroWithRankings?.npcName ?? heroNpcs[0]?.npcName ?? null;
  const effectiveSelectedHeroName =
    selectedHeroName &&
    heroNpcs.some((hero) => hero.npcName === selectedHeroName)
      ? selectedHeroName
      : defaultHeroName;
  const filteredRankings = effectiveSelectedHeroName
    ? rankings.filter(
        (ranking) => ranking.heroNpcName === effectiveSelectedHeroName,
      )
    : rankings;
  const sortedRankings = [...filteredRankings]
    .sort(
      (leftRanking, rightRanking) =>
        rightRanking.totalPoints - leftRanking.totalPoints,
    )
    .slice(0, limit);

  if (heroNpcs.length === 0) {
    return null;
  }

  return (
    <SectionCard className="gap-0 overflow-hidden border-border bg-card p-0">
      <SectionCardHeader
        icon={Trophy}
        title={t("events.ranking.title")}
        actions={
          <>
            {rankings.length > 0 ? (
              <ChevronLink
                className="inline-flex h-8 shrink-0 items-center gap-1 text-xs"
                render={
                  <Link
                    to="/$guildId/events/$eventId/ranking"
                    params={{ guildId, eventId }}
                  />
                }
              >
                {t("events.ranking.viewAll")}
              </ChevronLink>
            ) : null}
          </>
        }
      />

      {heroNpcs.length > 1 && (
        <Tabs
          value={effectiveSelectedHeroName ?? heroNpcs[0]?.npcName}
          onValueChange={setSelectedHeroName}
          className="border-b border-border/70 px-3 py-2"
        >
          <EventScrollableTabsList>
            {heroNpcs.map((hero) => (
              <TabsTrigger
                key={hero.id}
                value={hero.npcName}
                className="flex-shrink-0 text-xs"
              >
                {hero.npcName}
              </TabsTrigger>
            ))}
          </EventScrollableTabsList>
        </Tabs>
      )}

      <div
        key={effectiveSelectedHeroName}
        className="flex min-h-[180px] flex-col animate-in fade-in-0 duration-200"
      >
        {sortedRankings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Trophy className="w-6 h-6 mb-1.5 opacity-50" />
            <p className="text-xs">{t("events.ranking.noRanking")}</p>
          </div>
        ) : (
          <EventRankingTable
            rankings={sortedRankings}
            guildId={guildId}
            eventId={eventId}
            variant="compact"
          />
        )}
      </div>
    </SectionCard>
  );
};
