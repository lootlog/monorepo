import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Skull, ChevronRight, Frown } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { useRecentHeroKills } from "../hooks/use-recent-hero-kills";
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
      <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Skull className="w-5 h-5" />
          {t("events.kills.recentTitle")}
        </h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Skull className="w-5 h-5" />
        {t("events.kills.recentTitle")}
      </h2>

      {!kills || kills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Frown className="w-8 h-8 mb-2" />
          <p className="text-sm">{t("events.kills.noKills")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
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
                heroId
                  ? { guildId, eventId, heroId }
                  : { guildId, eventId }
              }
              className="flex items-center justify-center gap-2 p-3 mt-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t("events.kills.viewAll")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </>
      )}
    </Card>
  );
};
