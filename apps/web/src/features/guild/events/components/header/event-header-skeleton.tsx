import { DetailBar } from "@/components/common/detail-bar";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { EventHeaderFact } from "./event-header-fact";
import { EventHeaderFacts } from "./event-header-facts";
import { EventPageTabs, type EventTab } from "./event-page-tabs";

const FACT_LABEL_KEYS = [
  "events.header.status",
  "events.header.world",
  "events.header.assignmentTimeout",
  "events.header.dates",
] as const;

/** Stands in for `EventHeader`; the tabs need no data, so they show at once. */
export const EventHeaderSkeleton = ({ tab }: { tab?: EventTab }) => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });

  return (
    <>
      <DetailBar
        meta={
          <EventHeaderFacts>
            {FACT_LABEL_KEYS.map((key) => (
              <EventHeaderFact key={key} label={t(key)}>
                <SkeletonLine className="h-3.5 w-20" />
              </EventHeaderFact>
            ))}
          </EventHeaderFacts>
        }
        actions={<Skeleton className="h-10 w-96 max-w-full rounded-md" />}
      />
      {tab && guildId && eventId && (
        <EventPageTabs guildId={guildId} eventId={eventId} activeId={tab} />
      )}
    </>
  );
};
