import { Link, createFileRoute } from "@tanstack/react-router";
import {
  getCatalogControllerGetEventsQueryOptions,
  getCatalogControllerGetItemsQueryOptions,
} from "@lootlog/client/catalog";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { AboutWiki } from "@/components/home/about-wiki";
import { EventShelf } from "@/components/home/event-shelf";
import { HomeHero } from "@/components/home/home-hero";
import { HomeSection } from "@/components/home/home-section";
import { RecentItemChanges } from "@/components/home/recent-item-changes";
import { SlotBrowser } from "@/components/home/slot-browser";
import { prefetchCatalogSize } from "@/hooks/use-catalog-size";
import { NEW_BOSS_ITEMS } from "@/hooks/use-new-bosses";
import { t } from "@/i18n/messages";
import { prefetchPageQueries } from "@/lib/catalog-page-queries";
import { WIKI_EVENTS_QUERY } from "@/lib/item-events";
import { canonicalLink } from "@/lib/link-preview";

export const Route = createFileRoute("/")({
  component: HomeRoute,
  loader: ({ context: { queryClient } }) =>
    prefetchPageQueries(
      queryClient.prefetchQuery(
        getCatalogControllerGetItemsQueryOptions(NEW_BOSS_ITEMS),
      ),
      queryClient.prefetchQuery(
        getCatalogControllerGetEventsQueryOptions(WIKI_EVENTS_QUERY),
      ),
      ...prefetchCatalogSize(queryClient),
    ),
  head: () => ({
    meta: [
      {
        title: `${t("meta.homeTitle")} | ${t("meta.title")}`,
      },
    ],
    links: [canonicalLink("/")],
  }),
});

function HomeRoute() {
  return (
    <div className="flex flex-col gap-24 pb-6">
      <HomeHero />

      <HomeSection
        title={t("home.eventsTitle")}
        description={t("home.eventShelfDescription")}
        action={
          <ChevronLink render={<Link to="/events" />}>
            {t("catalog.allEvents")}
          </ChevronLink>
        }
      >
        <EventShelf />
      </HomeSection>

      <SlotBrowser />

      <HomeSection
        title={t("revisions.recentTitle")}
        description={t("revisions.recentDescription")}
      >
        <RecentItemChanges />
      </HomeSection>

      <HomeSection title={t("home.about.title")}>
        <AboutWiki />
      </HomeSection>
    </div>
  );
}
