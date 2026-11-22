import { createFileRoute } from "@tanstack/react-router";
import {
  fusionGoldCost,
  SOCKET_BONUSES,
  SYMBOL_TIERS,
  tierChests,
} from "@lootlog/domain/item-socket";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { TextLink } from "@lootlog/ui/components/text-link";
import { getCatalogControllerGetItemsQueryOptions } from "@lootlog/client/catalog";
import { ArticleSection } from "@/components/article/article-section";
import { PageHeader } from "@/components/common/page-header";
import { ChestCard } from "@/components/sockets/chest-card";
import { SymbolCard } from "@/components/sockets/symbol-card";
import { socketItemsQuery } from "@/hooks/use-socket-items";
import { t } from "@/i18n/messages";
import { MECHANICS_DOCUMENTATION_URL } from "@/lib/calculators";
import { prefetchPageQueries } from "@/lib/catalog-page-queries";
import { formatGold } from "@/lib/upgrade-cost-format";

const STEPS = ["components", "fusion", "enchant", "level"] as const;

export const Route = createFileRoute("/sockets")({
  component: SocketsRoute,
  loader: ({ context: { queryClient } }) =>
    prefetchPageQueries(
      queryClient.prefetchQuery(
        getCatalogControllerGetItemsQueryOptions(socketItemsQuery),
      ),
    ),
  head: () => ({
    meta: [{ title: `${t("socket.page.metaTitle")} | ${t("meta.title")}` }],
  }),
});

function SocketsRoute() {
  const [firstTier] = SYMBOL_TIERS;

  return (
    <div className="flex flex-col gap-10 py-6">
      <PageHeader
        title={t("socket.page.metaTitle")}
        description={t("socket.page.description")}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <ArticleSection id="sockets-how" title={t("socket.page.howTitle")}>
          <ol className="flex flex-col gap-3 text-sm text-pretty text-muted-foreground">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground tabular-nums">
                  {index + 1}
                </span>
                <span>{t(`socket.page.steps.${step}`)}</span>
              </li>
            ))}
          </ol>
          <TextLink
            className="text-sm"
            href={MECHANICS_DOCUMENTATION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("socket.page.source")}
          </TextLink>
        </ArticleSection>

        <ArticleSection
          id="sockets-items"
          title={t("socket.page.socketedTitle")}
        >
          <p className="text-sm text-pretty text-muted-foreground">
            {t("socket.page.socketed")}
          </p>
        </ArticleSection>
      </div>

      <ArticleSection
        id="sockets-recipes"
        title={t("socket.page.recipesTitle")}
        description={t("socket.recipeDescription")}
      >
        <Tabs defaultValue={String(firstTier?.maxLevel)} className="gap-5">
          <TabsList
            variant="underline"
            aria-label={t("socket.page.recipesTitle")}
          >
            {SYMBOL_TIERS.map((tier) => (
              <TabsTrigger key={tier.maxLevel} value={String(tier.maxLevel)}>
                {t(`socket.tiers.${tier.maxLevel}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {SYMBOL_TIERS.map((tier) => (
            <TabsContent
              key={tier.maxLevel}
              value={String(tier.maxLevel)}
              className="flex flex-col gap-4"
            >
              <p className="text-sm text-muted-foreground tabular-nums">
                {t("socket.page.tierSummary", {
                  min: tier.minLevel,
                  max: tier.maxLevel,
                  gold: formatGold(fusionGoldCost(tier)),
                })}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {SOCKET_BONUSES.map((bonus) => (
                  <li key={bonus} className="flex">
                    <SymbolCard tier={tier} bonus={bonus} />
                  </li>
                ))}
              </ul>
            </TabsContent>
          ))}
        </Tabs>
      </ArticleSection>

      <ArticleSection
        id="sockets-chests"
        title={t("socket.chests.title")}
        description={t("socket.chests.description")}
      >
        <Tabs defaultValue={String(firstTier?.maxLevel)} className="gap-5">
          <TabsList variant="underline" aria-label={t("socket.chests.title")}>
            {SYMBOL_TIERS.map((tier) => (
              <TabsTrigger key={tier.maxLevel} value={String(tier.maxLevel)}>
                {t("socket.chests.range", {
                  min: tier.minLevel,
                  max: tier.maxLevel,
                })}
              </TabsTrigger>
            ))}
          </TabsList>
          {SYMBOL_TIERS.map((tier) => (
            <TabsContent key={tier.maxLevel} value={String(tier.maxLevel)}>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {tierChests(tier).map((chest) => (
                  <li key={chest.id} className="flex">
                    <ChestCard chest={chest} />
                  </li>
                ))}
              </ul>
            </TabsContent>
          ))}
        </Tabs>
      </ArticleSection>
    </div>
  );
}
