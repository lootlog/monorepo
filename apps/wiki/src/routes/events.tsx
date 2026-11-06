import { Link, createFileRoute } from "@tanstack/react-router";
import { groupBy, orderBy } from "es-toolkit";
import { useCatalogControllerGetEvents } from "@lootlog/client/search";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ArticleSection } from "@/components/article/article-section";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { NpcPortrait } from "@/components/common/npc-portrait";
import { PageHeader } from "@/components/common/page-header";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { isHeroTrackersEvent } from "@/lib/hero-trackers";
import { eventSubtitle } from "@/lib/item-events";

export const Route = createFileRoute("/events")({
  component: EventsRoute,
  head: () => ({
    meta: [{ title: `${t("meta.eventsTitle")} | ${t("meta.title")}` }],
  }),
});

const HERO_TRACKERS_SECTION = "hero-trackers";

const EVENT_GRID = "grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3";

/** Every event Lootlog knows items of, by year, the latest first. */
function EventsRoute() {
  const { data, isError } = useCatalogControllerGetEvents({
    gameVersion: WIKI_GAME_VERSION,
  });

  // Events by year, the latest first; Tropiciele Herosów editions, which
  // have no year, come after them, and other events without one last.
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
      <PageHeader
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
                  <Link
                    to="/events/$eventSlug"
                    params={{ eventSlug: event.slug }}
                    className="group/event flex h-full flex-col gap-2 rounded-xl border border-border/50 bg-card p-2 outline-none transition-[border-color,background-color] duration-150 hover:border-border hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
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
                          count: event.itemCount.toLocaleString("pl-PL"),
                        })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </ArticleSection>
        ))
      )}
    </div>
  );
}
