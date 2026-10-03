import { getRankingSelection } from "./event-ranking-selection";
import { EmptyState } from "@/components/common/empty-state";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import type { EventRanking, EventHeroNpc } from "../../types/api";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useState } from "react";
import { HeroTabs } from "../shared/hero-tabs";
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

  const { effectiveSelectedHeroName, filteredRankings } = getRankingSelection(
    heroNpcs,
    rankings,
    selectedHeroName,
  );

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
    <SectionCard className="overflow-hidden">
      <SectionCardHeader
        icon={Trophy}
        title={t("events.ranking.title")}
        actions={
          rankings.length > 0 ? (
            <ChevronLink
              render=<Link
                to="/$guildId/events/$eventId/ranking"
                params={{ guildId, eventId }}
              />
            >
              {t("events.ranking.viewAll")}
            </ChevronLink>
          ) : null
        }
      />

      <HeroTabs
        placement="section"
        heroes={heroNpcs}
        valueKey="npcName"
        value={effectiveSelectedHeroName ?? undefined}
        onValueChange={(heroName) => setSelectedHeroName(heroName ?? null)}
      />

      <div
        key={effectiveSelectedHeroName}
        className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      >
        {sortedRankings.length === 0 ? (
          <EmptyState icon={Trophy} title={t("events.ranking.noRanking")} />
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
