import { formatNumber } from "@lootlog/domain/locale";
import { useCatalogSize } from "@/hooks/use-catalog-size";
import { t } from "@/i18n/messages";
import { HeroBoss } from "./hero-boss";
import { HomeSearch } from "./home-search";
import { QuickSearches } from "./quick-searches";

export function HomeHero() {
  const size = useCatalogSize();

  return (
    <section className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-dvw -translate-x-1/2 bg-[radial-gradient(70%_40%_at_50%_72%,rgb(234_88_12/0.26),transparent_72%)] lg:bg-[radial-gradient(42%_62%_at_74%_62%,rgb(234_88_12/0.26),transparent_72%),radial-gradient(30%_40%_at_74%_88%,rgb(245_158_11/0.16),transparent_70%)]"
      >
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-background" />
      </div>

      <div className="grid min-h-[calc(100dvh-var(--portal-header-height))] grid-cols-1 content-center items-center gap-12 py-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h1 className="text-[2.75rem] leading-none font-semibold tracking-[-0.035em] text-foreground md:text-[4.25rem]">
              {t("home.title")}
            </h1>
            <p className="max-w-[38ch] text-lg leading-relaxed text-pretty text-muted-foreground md:text-xl">
              {size
                ? t("home.descriptionWithSize", {
                    items: formatNumber(size.items),
                    npcs: formatNumber(size.npcs),
                  })
                : t("home.description")}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <HomeSearch />
            <QuickSearches />
          </div>
        </div>
        <HeroBoss />
      </div>
    </section>
  );
}
