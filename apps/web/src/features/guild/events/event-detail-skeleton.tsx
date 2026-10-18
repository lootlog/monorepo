import { BandSection } from "@/components/common/band-section";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import { EventHeaderSkeleton } from "./components/header/event-header-skeleton";
import { EmbeddedLootRowsSkeleton } from "./components/shared/embedded-loot-rows-skeleton";
import { EventOverviewRail } from "./event-overview-rail";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";

export const EventDetailSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea data-under-top-bar className="min-h-0 flex-1">
      <EventHeaderSkeleton tab="overview" />
      <div aria-busy="true" className="min-w-0">
        <EventOverviewRail
          heroes={
            <BandSection
              id="event-heroes-skeleton"
              title={t("events.heroes.title")}
              tiled
            >
              <TableRowsSkeleton rows={3} withHeader />
            </BandSection>
          }
          ranking={
            <BandSection
              id="event-ranking-skeleton"
              title={t("events.ranking.title")}
              tiled
            >
              <TableRowsSkeleton rows={5} withHeader />
            </BandSection>
          }
          activity={
            <>
              <BandSection
                id="event-kills-skeleton"
                title={t("events.kills.recentTitle")}
                tiled
              >
                <TableRowsSkeleton rows={10} withHeader />
              </BandSection>
              <BandSection
                id="event-loots-skeleton"
                title={t("events.loots.title")}
                tiled
              >
                <EmbeddedLootRowsSkeleton rows={3} />
              </BandSection>
            </>
          }
        />
      </div>
    </ScrollArea>
  );
};
