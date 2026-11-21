import { Link } from "@tanstack/react-router";
import { fusionGoldCost, type SymbolInfo } from "@lootlog/domain/item-socket";
import { ArticleSection } from "@/components/article/article-section";
import { StatTiles } from "@/components/common/stat-tiles";
import { SymbolRecipe } from "@/components/sockets/symbol-recipe";
import { t } from "@/i18n/messages";
import { formatGold } from "@/lib/upgrade-cost-format";

/**
 * How a symbol is made: the components fused into it, the level range of
 * the items it goes into and the fusion's cost.
 */
export function ItemSymbolSection({ symbol }: { symbol: SymbolInfo }) {
  const { tier } = symbol;

  return (
    <ArticleSection
      id="item-symbol-recipe"
      title={t("socket.recipe")}
      description={t("socket.recipeDescription")}
      action={
        <Link
          to="/sockets"
          className="text-sm font-medium text-primary outline-none hover:underline focus-visible:underline"
        >
          {t("navigation.sockets")}
        </Link>
      }
    >
      <SymbolRecipe recipe={symbol.recipe} />
      <StatTiles
        className="grid-cols-2"
        tiles={[
          {
            label: t("socket.levels"),
            value: t("socket.levelRange", {
              min: tier.minLevel,
              max: tier.maxLevel,
            }),
          },
          {
            label: t("socket.fusionCost"),
            value: formatGold(fusionGoldCost(tier)),
          },
        ]}
      />
    </ArticleSection>
  );
}
