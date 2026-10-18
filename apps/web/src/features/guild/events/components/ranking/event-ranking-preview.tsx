import { getRankingSelection } from "./event-ranking-selection";
import { EmptyState } from "@/components/common/empty-state";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import type { EventRanking, EventHeroNpc } from "../../types/api";
import { BandSection } from "@/components/common/band-section";
import { useState } from "react";
import { EventRankingHeroSelect } from "./event-ranking-hero-select";
import { EventRankingTable } from "./event-ranking-table";

interface EventRankingPreviewProps {
  rankings: EventRanking[];
  heroNpcs: EventHeroNpc[];
  guildId: string;
  eventId: string;
  limit?: number;
  /** Adds the member's own place when it falls outside the leaders. */
  currentMemberId?: number;
}

export const EventRankingPreview = ({
  rankings,
  heroNpcs,
  guildId,
  eventId,
  limit = 5,
  currentMemberId,
}: EventRankingPreviewProps) => {
  const { t } = useTranslation();
  const [selectedHeroName, setSelectedHeroName] = useState<string | null>(null);

  const { effectiveSelectedHeroName, filteredRankings } = getRankingSelection(
    heroNpcs,
    rankings,
    selectedHeroName,
  );

  if (heroNpcs.length === 0) {
    return null;
  }

  return (
    <BandSection
      id="event-ranking-preview"
      title={t("events.ranking.title")}
      tiled
      trailing={
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
    >
      <EventRankingHeroSelect
        heroes={heroNpcs}
        rankings={rankings}
        value={effectiveSelectedHeroName}
        onValueChange={setSelectedHeroName}
      />

      <div
        key={effectiveSelectedHeroName}
        className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      >
        {filteredRankings.length === 0 ? (
          <EmptyState
            compact
            icon={Trophy}
            title={t("events.ranking.noRanking")}
          />
        ) : (
          <EventRankingTable
            rankings={filteredRankings}
            guildId={guildId}
            eventId={eventId}
            variant="compact"
            limit={limit}
            currentMemberId={currentMemberId}
          />
        )}
      </div>
    </BandSection>
  );
};
