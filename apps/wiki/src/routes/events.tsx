import { Link, createFileRoute } from "@tanstack/react-router";
import { groupBy, orderBy } from "es-toolkit";
import {
  getCatalogControllerGetEventsQueryOptions,
  useCatalogControllerGetEvents,
} from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ArticleSection } from "@/components/article/article-section";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import { t } from "@/i18n/messages";
import { isHeroTrackersEvent } from "@/lib/hero-trackers";
import { prefetchPageQueries } from "@/lib/catalog-page-queries";
import { WIKI_EVENTS_QUERY, eventSubtitle } from "@/lib/item-events";
import { wikiPageHead } from "@/lib/link-preview";
import { formatNumber } from "@lootlog/domain/locale";
import { Card } from "@lootlog/ui/components/card";

export const Route = createFileRoute("/events")({
  component: EventsRoute,
  loader: ({ context: { queryClient } }) =>
    prefetchPageQueries(
      queryClient.prefetchQuery(
        getCatalogControllerGetEventsQueryOptions(WIKI_EVENTS_QUERY),
      ),
    ),
  head: () =>
    wikiPageHead({
      path: "/events",
      title: t("meta.eventsTitle"),
      description: t("meta.eventsDescription"),
    }),
});

const HERO_TRACKERS_SECTION = "hero-trackers";

const EVENT_GRID = "grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3";

function EventsRoute() {
  const { data, isError } = useCatalogControllerGetEvents(WIKI_EVENTS_QUERY);

  const sections = orderBy(
    Object.entries(
      groupBy(data?.events ?? [], ({ name, year }) =>
        year !== null
          ? String(year)
          : isHeroTrackersEvent(name)
            ? HERO_TRACKERS_SECTION
            : "",
      ),
    ),
    [([key]) => (key === HERO_TRACKERS_SECTION ? 1 : Number(key))],
    ["desc"],
  );

  return (
    <div className="flex flex-col gap-8 py-6">
      <PageBreadcrumbs items={[{ label: t("navigation.events") }]} />
      <PortalPageHeader
        title={t("navigation.events")}
        description={t("catalog.eventsDescription")}
      />

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : !data ? (
        <ul className={EVENT_GRID}>
          {Array.from({ length: 12 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-[9.5rem] rounded-xl" />
            </li>
          ))}
        </ul>
      ) : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("catalog.eventsEmpty")}
        </p>
      ) : (
        sections.map(([key, events]) => (
          <ArticleSection
            key={key}
            id={`events-${key || "other"}`}
            title={
              key === HERO_TRACKERS_SECTION
                ? t("npc.heroTrackers")
                : key || t("catalog.eventsWithoutYear")
            }
            count={events.length}
          >
            <ul className={EVENT_GRID}>
              {events.map((event) => (
                <li key={event.slug}>
                  <Card variant="interactive" className="h-full gap-0 py-0">
                    <Link
                      to="/events/$eventSlug"
                      params={{ eventSlug: event.slug }}
                      className="group/event flex h-full flex-col gap-2 rounded-[inherit] p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <NpcPortrait
                        icon={event.boss?.icon}
                        size="md"
                        className="w-full"
                      />
                      <span className="flex min-w-0 flex-col gap-0.5 px-1 pb-1">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {event.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {eventSubtitle(event.name, event.boss)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {t("catalog.eventItemCount", {
                            count: formatNumber(event.itemCount),
                          })}
                        </span>
                      </span>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          </ArticleSection>
        ))
      )}
    </div>
  );
}
