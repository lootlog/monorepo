import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Skull } from "lucide-react";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useRecentHeroKills } from "../../hooks/queries/use-recent-hero-kills";
import type { EventHeroNpc } from "../../types/api";
import { HeroTabs } from "../shared/hero-tabs";
import { EventKillsTable } from "./event-kills-table";

interface RecentKillsPreviewProps {
  guildId: string;
  eventId: string;
  heroId?: string;
  heroNpcs?: EventHeroNpc[];
  showHeroTabs?: boolean;
  limit?: number;
}

export const RecentKillsPreview = ({
  guildId,
  eventId,
  heroId,
  heroNpcs,
  showHeroTabs,
  limit = 5,
}: RecentKillsPreviewProps) => {
  const { t } = useTranslation();
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  const activeHero = selectedHeroId
    ? heroNpcs?.find((h) => h.id === selectedHeroId)
    : heroNpcs?.[0];

  const activeHeroId =
    showHeroTabs && heroNpcs && heroNpcs.length > 1 ? activeHero?.id : heroId;

  const {
    data: kills,
    isError,
    isLoading,
    isFetching,
    refetch,
  } = useRecentHeroKills({
    guildId,
    eventId,
    heroId: activeHeroId,
    limit,
  });

  return (
    <SectionCard className="overflow-hidden">
      <SectionCardHeader
        icon={Skull}
        title={t("events.kills.recentTitle")}
        actions={
          kills && kills.length > 0 ? (
            <ChevronLink
              render=<Link
                to={
                  activeHeroId
                    ? "/$guildId/events/$eventId/heroes/$heroId/kills"
                    : "/$guildId/events/$eventId/kills"
                }
                params={
                  activeHeroId
                    ? { guildId, eventId, heroId: activeHeroId }
                    : { guildId, eventId }
                }
              />
            >
              {t("events.kills.viewAll")}
            </ChevronLink>
          ) : null
        }
      />

      {showHeroTabs && heroNpcs && (
        <HeroTabs
          placement="section"
          heroes={heroNpcs}
          value={activeHero?.id}
          onValueChange={(heroId) => setSelectedHeroId(heroId ?? null)}
        />
      )}

      <EventKillsTable
        variant="preview"
        eventId={eventId}
        guildId={guildId}
        hasError={isError}
        isLoading={isLoading}
        kills={kills ?? []}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    </SectionCard>
  );
};
