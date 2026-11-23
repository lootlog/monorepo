import { Link } from "@tanstack/react-router";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { fusionGoldCost, type SymbolInfo } from "@lootlog/domain/item-socket";
import { ArticleSection } from "@/components/article/article-section";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { SymbolRecipe } from "@/components/sockets/symbol-recipe";
import { t } from "@/i18n/messages";
import { formatGold } from "@/lib/upgrade-cost-format";

export function ItemSymbolSection({ symbol }: { symbol: SymbolInfo }) {
  const { tier } = symbol;

  return (
    <ArticleSection
      id="item-symbol-recipe"
      title={t("socket.recipe")}
      description={t("socket.recipeDescription")}
      action={
        <ChevronLink render={<Link to="/sockets" />}>
          {t("navigation.sockets")}
        </ChevronLink>
      }
    >
      <SymbolRecipe recipe={symbol.recipe} />
      <StatsTileGrid framed className="sm:grid-cols-2">
        <StatsTile
          label={t("socket.levels")}
          value={t("socket.levelRange", {
            min: tier.minLevel,
            max: tier.maxLevel,
          })}
        />
        <StatsTile
          label={t("socket.fusionCost")}
          value={formatGold(fusionGoldCost(tier))}
        />
      </StatsTileGrid>
    </ArticleSection>
  );
}
