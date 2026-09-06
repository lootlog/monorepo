import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Skull } from "lucide-react";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { useRecentHeroKills } from "../../hooks/queries/use-recent-hero-kills";
import type { EventHeroNpc } from "../../types/api";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";
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
  } = useRecentHeroKills({
    guildId,
    eventId,
    heroId: activeHeroId,
    limit,
  });

  return (
    <SectionCard className="gap-0 overflow-hidden border-border bg-card p-0">
      <SectionCardHeader
        icon={Skull}
        title={t("events.kills.recentTitle")}
        actions={
          <>
            {kills && kills.length > 0 ? (
              <ChevronLink
                className="inline-flex h-8 shrink-0 items-center gap-1 text-xs"
                render={
                  <Link
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
                }
              >
                {t("events.kills.viewAll")}
              </ChevronLink>
            ) : null}
          </>
        }
      />

      {showHeroTabs && heroNpcs && heroNpcs.length > 1 && (
        <Tabs
          value={activeHero?.id ?? heroNpcs[0]?.id}
          onValueChange={setSelectedHeroId}
          className="border-b border-border/70 px-3 py-2"
        >
          <EventScrollableTabsList>
            {heroNpcs.map((hero) => (
              <TabsTrigger
                key={hero.id}
                value={hero.id}
                className="flex-shrink-0 text-xs"
              >
                {hero.npcName}
              </TabsTrigger>
            ))}
          </EventScrollableTabsList>
        </Tabs>
      )}

      <EventKillsTable
        variant="preview"
        eventId={eventId}
        guildId={guildId}
        hasError={isError}
        isLoading={isLoading}
        kills={kills ?? []}
      />
    </SectionCard>
  );
};
