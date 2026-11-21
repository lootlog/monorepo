import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { findSymbol, fusionGoldCost } from "@lootlog/domain/item-socket";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { itemStatValue } from "@lootlog/domain/item-stat";
import {
  type ItemUpgrade,
  isUpgradable,
  upgradedItemLevel,
} from "@lootlog/domain/item-upgrade";
import { ArticleSection } from "@/components/article/article-section";
import { ChoiceCard } from "@/components/common/choice-card";
import { StatTiles } from "@/components/common/stat-tiles";
import { SymbolRecipe } from "@/components/sockets/symbol-recipe";
import { useSocketOptions } from "@/hooks/use-socket-items";
import { t } from "@/i18n/messages";
import { legendaryBonusIcon } from "@/lib/legendary-bonuses";
import { formatGold } from "@/lib/upgrade-cost-format";

type ItemSocketSectionProps = {
  /** The item as dropped, at the level it is shown at. */
  item: CatalogItemDtoOutput;
  upgrade: ItemUpgrade;
  onChange: (upgrade: ItemUpgrade) => void;
};

/**
 * The symbol set in the item's socket: the legendary bonuses whose symbols
 * fit it, and for the chosen one how strong its bonus is, what it is fused
 * from and what the fusion costs.
 */
export function ItemSocketSection({
  item,
  upgrade,
  onChange,
}: ItemSocketSectionProps) {
  const { options, isLoaded } = useSocketOptions(item);

  const chosenId = options.find(
    ({ bonus }) => bonus === upgrade.symbol,
  )?.symbolId;

  const chosen = chosenId === undefined ? undefined : findSymbol(chosenId);

  const fleeting = itemStatValue(item.stat, "socket_fleeting_legbon")?.split(
    ",",
  )[0];

  const bonusLevel = upgradedItemLevel(
    item.lvl,
    isUpgradable(item) ? upgrade.level : 0,
  );

  return (
    <ArticleSection
      id="item-socket"
      title={t("socket.title")}
      description={t("socket.description")}
    >
      {fleeting ? (
        <p className="text-sm text-pretty text-muted-foreground">
          {t("socket.fleeting", { bonus: t(`legendaryBonus.${fleeting}`) })}
        </p>
      ) : null}

      {!isLoaded ? (
        <Skeleton className="h-28 w-full rounded-lg" />
      ) : options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {t("socket.noOptions")}
        </p>
      ) : (
        <fieldset className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
          <legend className="sr-only">{t("socket.title")}</legend>
          <ChoiceCard
            name="item-socket-symbol"
            value=""
            checked={!chosen}
            onChange={() => onChange({ ...upgrade, symbol: undefined })}
            className="flex-row items-center"
          >
            <span className="text-sm font-medium text-foreground">
              {fleeting ? t("socket.noneFleeting") : t("socket.none")}
            </span>
          </ChoiceCard>
          {options.map(({ bonus }) => {
            const Icon = legendaryBonusIcon(bonus);

            return (
              <ChoiceCard
                key={bonus}
                name="item-socket-symbol"
                value={bonus}
                checked={chosen?.bonus === bonus}
                onChange={() => onChange({ ...upgrade, symbol: bonus })}
                className="flex-row items-center"
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-(--item-rarity)"
                />
                <span className="text-sm font-medium text-foreground">
                  {t(`legendaryBonus.${bonus}`)}
                </span>
              </ChoiceCard>
            );
          })}
        </fieldset>
      )}

      {chosen ? (
        <div className="flex flex-col gap-4">
          <StatTiles
            className="grid-cols-2"
            tiles={[
              {
                label: t("socket.symbol"),
                value: t(`legendaryBonus.${chosen.bonus}`),
                hint: t("socket.bonusLevel", { level: bonusLevel }),
              },
              {
                label: t("socket.fusionCost"),
                value: formatGold(fusionGoldCost(chosen.tier)),
              },
            ]}
          />
          <section
            aria-labelledby="item-socket-recipe"
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <h3
                id="item-socket-recipe"
                className="text-base font-semibold text-foreground"
              >
                {t("socket.recipe")}
              </h3>
              <p className="text-sm text-pretty text-muted-foreground">
                {t("socket.recipeDescription")}
              </p>
            </div>
            <SymbolRecipe recipe={chosen.recipe} symbolId={chosenId} />
          </section>
        </div>
      ) : null}
    </ArticleSection>
  );
}
