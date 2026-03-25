import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Skull, ChevronRight, Frown } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { useRecentHeroKills } from "../../hooks/queries/use-recent-hero-kills";
import { KillHistoryCard } from "./kill-history-card";
import type { EventHeroNpc } from "../../hooks/queries/use-events";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";
import { Spinner } from "@lootlog/ui/components/spinner";

interface RecentKillsPreviewProps {
  guildId: string;
  eventId: string;
  heroId?: string;
  heroNpcs?: EventHeroNpc[];
  showHeroTabs?: boolean;
  limit?: number;
  showHeroName?: boolean;
}

export const RecentKillsPreview = ({
  guildId,
  eventId,
  heroId,
  heroNpcs,
  showHeroTabs,
  limit = 5,
  showHeroName = false,
}: RecentKillsPreviewProps) => {
  const { t } = useTranslation();
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

  const activeHero = selectedHeroId
    ? heroNpcs?.find((h) => h.id === selectedHeroId)
    : heroNpcs?.[0];

  const activeHeroId =
    showHeroTabs && heroNpcs && heroNpcs.length > 1 ? activeHero?.id : heroId;

  const { data: kills, isLoading } = useRecentHeroKills({
    guildId,
    eventId,
    heroId: activeHeroId,
    limit,
  });

  if (isLoading) {
    return (
      <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 shadow-inner shadow-primary/10">
            <Skull className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("events.kills.recentSubtitle")}
            </p>
            <h2 className="text-base font-semibold">
              {t("events.kills.recentTitle")}
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <Spinner className="h-6 w-6" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 shadow-inner shadow-primary/10">
          <Skull className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("events.kills.recentSubtitle")}
          </p>
          <h2 className="text-base font-semibold">
            {t("events.kills.recentTitle")}
          </h2>
        </div>
      </div>

      {showHeroTabs && heroNpcs && heroNpcs.length > 1 && (
        <Tabs
          value={activeHero?.id ?? heroNpcs[0]?.id}
          onValueChange={setSelectedHeroId}
          className="mb-3"
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

      {!kills || kills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Frown className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">{t("events.kills.noKills")}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {kills.map((kill) => (
              <KillHistoryCard
                key={kill.id}
                kill={kill}
                showHeroName={showHeroName || !activeHeroId}
                minimal
                guildId={guildId}
                eventId={eventId}
              />
            ))}
          </div>

          {kills.length > 0 && (
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
              className="block mt-3"
            >
              <Button variant="outline" className="w-full" size="sm">
                {t("events.kills.viewAll")}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </>
      )}
    </Card>
  );
};
