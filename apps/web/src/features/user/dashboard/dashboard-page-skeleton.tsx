import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Clock, Crown, Swords, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BandSection } from "@/components/common/band-section";
import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { StatsTile, StatsTileGrid } from "@/components/common/stats-tile";
import { DashboardColumns } from "./dashboard-columns";
import { LiveFeedSkeleton } from "./feed/live-feed-skeleton";

const TODAY_TILES = [
  { key: "kills", icon: Swords },
  { key: "online", icon: Clock },
  { key: "streak", icon: Zap },
  { key: "weekMonster", icon: Crown },
] as const;

export function DashboardPageSkeleton() {
  const { t } = useTranslation();

  return (
    <ScrollArea data-under-top-bar className="h-full min-h-0">
      <div className="min-w-0" role="status" aria-label={t("common.loading")}>
        <BandSection
          id="dashboard-today-skeleton"
          title={t("statistics.today.title")}
          tiled
        >
          <StatsTileGrid className="grid-cols-2 xl:grid-cols-4">
            {TODAY_TILES.map(({ key, icon }) => (
              <StatsTile
                key={key}
                icon={icon}
                label={
                  key === "streak"
                    ? t("kills.records.streak")
                    : t(`statistics.today.${key}`)
                }
                value={<Skeleton className="my-0.5 h-6 w-16" />}
              />
            ))}
          </StatsTileGrid>
        </BandSection>
        <DashboardColumns
          feed={
            <BandSection
              id="dashboard-feed-skeleton"
              title={t("statistics.feedTitle")}
              tiled
            >
              <LiveFeedSkeleton />
            </BandSection>
          }
          reservations={
            <BandSection
              id="dashboard-reservations-skeleton"
              title={t("reservations.my.title")}
              tiled
            >
              <ListTileSkeleton />
              <ListTileSkeleton />
            </BandSection>
          }
          aside={
            <BandSection
              id="dashboard-battles-skeleton"
              title={t("statistics.recentBattles.title")}
              tiled
            >
              {Array.from({ length: 5 }, (_, key) => (
                <ListTileSkeleton key={key} actions={2} />
              ))}
            </BandSection>
          }
        />
      </div>
    </ScrollArea>
  );
}
