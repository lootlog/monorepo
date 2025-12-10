import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Skull, ChevronRight, Frown } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { useRecentHeroKills } from "../hooks/queries/use-recent-hero-kills";
import { KillHistoryCard } from "./kill-history-card";

interface RecentKillsPreviewProps {
  guildId: string;
  eventId: string;
  heroId?: string;
  limit?: number;
  showHeroName?: boolean;
}

export const RecentKillsPreview = ({
  guildId,
  eventId,
  heroId,
  limit = 5,
  showHeroName = false,
}: RecentKillsPreviewProps) => {
  const { t } = useTranslation();
  const { data: kills, isLoading } = useRecentHeroKills({
    guildId,
    eventId,
    heroId,
    limit,
  });

  if (isLoading) {
    return (
      <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Skull className="w-4 h-4" />
          {t("events.kills.recentTitle")}
        </h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Skull className="w-4 h-4" />
        {t("events.kills.recentTitle")}
      </h2>

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
                showHeroName={showHeroName || !heroId}
                minimal
                guildId={guildId}
                eventId={eventId}
              />
            ))}
          </div>

          {kills.length > 0 && (
            <Link
              to={
                heroId
                  ? "/$guildId/events/$eventId/heroes/$heroId/kills"
                  : "/$guildId/events/$eventId/kills"
              }
              params={
                heroId ? { guildId, eventId, heroId } : { guildId, eventId }
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
