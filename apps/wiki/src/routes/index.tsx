import { createFileRoute } from "@tanstack/react-router";
import { AboutWiki } from "@/components/home/about-wiki";
import { HomeSearch } from "@/components/home/home-search";
import { HomeSection } from "@/components/home/home-section";
import { HomeSubsection } from "@/components/home/home-subsection";
import { LegendaryBonusShortcuts } from "@/components/home/legendary-bonus-shortcuts";
import { NewEventItems } from "@/components/home/new-event-items";
import { NewMonsters } from "@/components/home/new-monsters";
import { QuickSearches } from "@/components/home/quick-searches";
import { RarityShortcuts } from "@/components/home/rarity-shortcuts";
import { SectionTile } from "@/components/home/section-tile";
import { SlotShortcuts } from "@/components/home/slot-shortcuts";
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
      <header className="flex flex-col pt-10 md:pt-14">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {t("home.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-pretty text-muted-foreground">
          {t("home.description")}
        </p>
        <div className="mt-6 flex w-full flex-col gap-3">
          <HomeSearch />
          <QuickSearches />
        </div>
      </header>

      <HomeSection title={t("home.sectionsTitle")}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </HomeSection>

      <HomeSection
        title={t("home.newMonstersTitle")}
        description={t("home.newMonstersDescription")}
      >
        <NewMonsters />
      </HomeSection>

      <HomeSection
        title={t("home.newEventItemsTitle")}
        description={t("home.newEventItemsDescription")}
      >
        <NewEventItems />
      </HomeSection>

      <HomeSection
        title={t("home.browseTitle")}
        description={t("home.browseDescription")}
      >
        <div className="flex flex-col gap-8">
          <HomeSubsection title={t("home.bonusesTitle")}>
            <LegendaryBonusShortcuts />
          </HomeSubsection>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-6">
            <HomeSubsection title={t("home.slotsTitle")}>
              <SlotShortcuts />
            </HomeSubsection>
            <HomeSubsection title={t("home.raritiesTitle")}>
              <RarityShortcuts />
            </HomeSubsection>
          </div>
        </div>
      </HomeSection>

      <HomeSection title={t("home.about.title")}>
        <AboutWiki />
      </HomeSection>
    </div>
  );
}
