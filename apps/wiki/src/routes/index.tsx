import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { HomeSearch } from "@/components/home/home-search";
import { LegendaryBonusShortcuts } from "@/components/home/legendary-bonus-shortcuts";
import { NewDrops } from "@/components/home/new-drops";
import { NewMonsters } from "@/components/home/new-monsters";
import { QuickSearches } from "@/components/home/quick-searches";
import { RarityShortcuts } from "@/components/home/rarity-shortcuts";
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
    <div className="flex flex-col gap-10 py-6">
      <header className="relative isolate overflow-hidden rounded-xl border border-border/50 bg-card px-5 py-8 md:px-10 md:py-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_85%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]"
        />
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          {t("home.eyebrow")}
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
          {t("home.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-pretty text-muted-foreground md:text-base">
          {t("home.description")}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <HomeSearch />
          <QuickSearches />
        </div>
      </header>

      <section aria-labelledby="home-new-drops" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2
            id="home-new-drops"
            className="text-base font-semibold text-foreground"
          >
            {t("home.newDropsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("home.newDropsDescription")}
          </p>
        </div>
        <NewDrops />
      </section>

      <section
        aria-labelledby="home-new-monsters"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="home-new-monsters"
            className="text-base font-semibold text-foreground"
          >
            {t("home.newMonstersTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("home.newMonstersDescription")}
          </p>
        </div>
        <NewMonsters />
      </section>

      <section aria-labelledby="home-bonuses" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2
            id="home-bonuses"
            className="text-base font-semibold text-foreground"
          >
            {t("home.bonusesTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("home.bonusesDescription")}
          </p>
        </div>
        <LegendaryBonusShortcuts />
      </section>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-6">
        <section aria-labelledby="home-slots" className="flex flex-col gap-4">
          <h2
            id="home-slots"
            className="text-base font-semibold text-foreground"
          >
            {t("home.slotsTitle")}
          </h2>
          <SlotShortcuts />
        </section>

        <section
          aria-labelledby="home-rarities"
          className="flex flex-col gap-4"
        >
          <h2
            id="home-rarities"
            className="text-base font-semibold text-foreground"
          >
            {t("home.raritiesTitle")}
          </h2>
          <RarityShortcuts />
        </section>
      </div>

      <section aria-labelledby="home-sections" className="flex flex-col gap-4">
        <h2
          id="home-sections"
          className="text-base font-semibold text-foreground"
        >
          {t("home.sectionsTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <Card key={section.link.to} className="gap-2">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Icon
                        aria-hidden="true"
                        className="size-4 text-primary"
                      />
                      {t(section.labelKey)}
                    </CardTitle>
                    <ChevronLink render={<Link {...section.link} />}>
                      {t("home.open")}
                    </ChevronLink>
                  </div>
                  <CardDescription>{t(section.descriptionKey)}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
