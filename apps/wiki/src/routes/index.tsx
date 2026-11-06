import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { AboutWiki } from "@/components/home/about-wiki";
import { HeroLineup } from "@/components/home/hero-lineup";
import { HomeSearch } from "@/components/home/home-search";
import { HomeSection } from "@/components/home/home-section";
import { NewEventItems } from "@/components/home/new-event-items";
import { NewMonsters } from "@/components/home/new-monsters";
import { QuickSearches } from "@/components/home/quick-searches";
import { RecentItemChanges } from "@/components/home/recent-item-changes";
import { SectionTile } from "@/components/home/section-tile";
import { SlotSearch } from "@/components/home/slot-search";
import { t } from "@/i18n/messages";
import { WIKI_NAVIGATION } from "@/navigation/wiki-navigation";

// The sections that search, which the home page introduces.
const sections = WIKI_NAVIGATION.flatMap(({ descriptionKey, ...section }) =>
  descriptionKey ? [{ ...section, descriptionKey }] : [],
);

export const Route = createFileRoute("/")({
  component: HomeRoute,
  head: () => ({
    meta: [
      {
        title: `${t("meta.homeTitle")} | ${t("meta.title")}`,
      },
    ],
  }),
});

function HomeRoute() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 pb-6 md:gap-16">
      <header className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 pt-8 md:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
            {t("home.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-pretty text-muted-foreground">
            {t("home.description")}
          </p>
          <div className="mt-6 flex w-full flex-col gap-3">
            <HomeSearch />
            <QuickSearches />
          </div>
        </div>
        <HeroLineup />
      </header>

      <HomeSection
        title={t("home.newMonstersTitle")}
        description={t("home.newMonstersDescription")}
      >
        <NewMonsters />
      </HomeSection>

      <HomeSection
        title={t("home.newEventItemsTitle")}
        description={t("home.newEventItemsDescription")}
        action={
          <ChevronLink render={<Link to="/events" />}>
            {t("catalog.allEvents")}
          </ChevronLink>
        }
      >
        <NewEventItems />
      </HomeSection>

      <HomeSection
        title={t("revisions.recentTitle")}
        description={t("revisions.recentDescription")}
      >
        <RecentItemChanges />
      </HomeSection>

      <HomeSection
        title={t("home.slotsTitle")}
        description={t("home.slotsDescription")}
      >
        <div className="grid items-center gap-8 rounded-2xl border border-border/50 bg-card/60 p-5 md:grid-cols-[auto_minmax(0,1fr)] md:p-8">
          <SlotSearch />
          <ul className="grid gap-4 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.link.to}>
                <SectionTile
                  link={section.link}
                  icon={section.icon}
                  label={t(section.labelKey)}
                  description={t(section.descriptionKey)}
                />
              </li>
            ))}
          </ul>
        </div>
      </HomeSection>

      <HomeSection title={t("home.about.title")}>
        <AboutWiki />
      </HomeSection>
    </div>
  );
}
