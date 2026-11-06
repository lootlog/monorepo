import { Navigate, createFileRoute, linkOptions } from "@tanstack/react-router";
import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { ITEM_RARITY_STYLES } from "@lootlog/ui/components/item-tile-details";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { CompareButton } from "@/components/comparison/compare-button";
import { EquipButton } from "@/components/equipment/equip-button";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { ItemDropSources } from "@/components/items/item-drop-sources";
import { ItemInfobox } from "@/components/items/item-infobox";
import { ItemRelatedDrops } from "@/components/items/item-related-drops";
import { ItemElasticLevelSection } from "@/components/items/item-elastic-level-section";
import { ItemUpgradeSection } from "@/components/items/item-upgrade-section";
import { renderStatChanges } from "@/components/render-stat-changes";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import {
  type ItemPageSearch,
  itemPageParams,
  itemPageSearch,
  readPageSegment,
  WIKI_GAME_VERSION,
} from "@/lib/catalog-links";
import { itemForCharacter } from "@lootlog/domain/elastic-level";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import {
  isUpgradable,
  isUpgradeBonusKey,
  isUpgradeLevel,
  type ItemUpgrade,
  NO_UPGRADE,
  upgradeItemStat,
} from "@lootlog/domain/item-upgrade";
import { findStatChanges } from "@/lib/stat-changes";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

export const Route = createFileRoute("/items_/$itemSlug")({
  component: ItemRoute,
  head: () => ({
    meta: [{ title: `${t("meta.itemTitle")} | ${t("meta.title")}` }],
  }),
  validateSearch: (search: {
    upgrade?: unknown;
    bonus?: unknown;
  }): ItemPageSearch => {
    const level = Number(search.upgrade);
    const bonus = String(search.bonus ?? "");

    if (!isUpgradeLevel(level) || level === 0) return {};

    // Only a +5 item carries a bonus.
    return level === 5 && isUpgradeBonusKey(bonus)
      ? { upgrade: level, bonus }
      : { upgrade: level };
  },
});

function ItemRoute() {
  const { itemSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { set } = useEquipmentSet();
  const id = readPageSegment(itemSlug)?.id;

  const { data, isError } = useCatalogControllerGetItems(
    {
      ids: id === undefined ? [] : [id],
      gameVersion: WIKI_GAME_VERSION,
      limit: 1,
    },
    { query: { enabled: id !== undefined } },
  );

  const item = data?.hits[0];

  if (isError) {
    return (
      <p role="alert" className="py-6 text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (id === undefined || (data && !item)) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        {t("catalog.itemNotFound")}
      </p>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-12 w-96 max-w-full" />
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-[36rem] w-full rounded-xl max-xl:order-first" />
        </div>
      </div>
    );
  }

  // An old link, or one with an outdated name, moves to the item's own URL.
  if (itemPageParams(item).itemSlug !== itemSlug) {
    return (
      <Navigate
        to="/items/$itemSlug"
        params={itemPageParams(item)}
        search={search}
        replace
      />
    );
  }

  // An elastic item shows as the set's character would loot it, and is
  // upgraded from there.
  const looted = itemForCharacter(item, set.level);
  const canUpgrade = isUpgradable(looted);

  const upgrade: ItemUpgrade =
    canUpgrade && search.upgrade
      ? { level: search.upgrade, bonus: search.bonus }
      : NO_UPGRADE;

  const stat = upgradeItemStat(looted, upgrade);
  const rarity = resolveItemRarity(item.rarity);
  const styles = ITEM_RARITY_STYLES[rarity];
  const typeLabel = item.type ? ITEM_TILE_LABELS.type[item.type] : undefined;
  const slot = findEquipmentSlot(item.type);

  return (
    <article className={cn("flex flex-col gap-6 py-6", styles.accent)}>
      <PageBreadcrumbs
        items={[
          {
            label: t("navigation.items"),
            link: linkOptions({ to: "/items", search: EMPTY_ITEMS_SEARCH }),
          },
          ...(typeLabel && item.type
            ? [
                {
                  label: typeLabel,
                  link: linkOptions({
                    to: "/items",
                    search: slot
                      ? { ...EMPTY_ITEMS_SEARCH, slot: slot.id }
                      : { ...EMPTY_ITEMS_SEARCH, types: item.type },
                  }),
                },
              ]
            : []),
          { label: item.name },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm">
            <span className={cn("font-semibold", styles.label)}>
              {ITEM_TILE_LABELS.rarity[rarity]}
            </span>
            {typeLabel ? (
              <span className="text-muted-foreground"> · {typeLabel}</span>
            ) : null}
            {looted.lvl > 0 ? (
              <span className="text-muted-foreground tabular-nums">
                {" "}
                · {t("common.levelShort", { level: looted.lvl })}
              </span>
            ) : null}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
            {item.name}
          </h1>
        </div>
        <div
          role="group"
          aria-label={t("item.actions")}
          className="flex flex-wrap gap-2"
        >
          <EquipButton item={item} upgrade={upgrade} />
          <CompareButton item={item} upgrade={upgrade} />
        </div>
      </header>

      <div className="grid items-start gap-x-8 gap-y-10 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1">
          <ItemInfobox
            item={looted}
            stat={stat}
            upgradeLevel={upgrade.level}
            renderStat={renderStatChanges(looted.stat, stat)}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-12 xl:col-start-1 xl:row-start-1">
          <ItemDropSources sources={item.droppedBy} />
          <ItemElasticLevelSection item={item} level={looted.lvl} />
          {canUpgrade ? (
            <ItemUpgradeSection
              item={looted}
              upgrade={upgrade}
              changes={findStatChanges(looted.stat, stat)}
              onChange={(next) =>
                void navigate({
                  replace: true,
                  resetScroll: false,
                  search: itemPageSearch(next),
                })
              }
            />
          ) : slot ? (
            <p className="text-sm text-muted-foreground">
              {t("upgrade.notUpgradable")}
            </p>
          ) : null}
          <ItemRelatedDrops item={item} />
        </div>
      </div>
    </article>
  );
}
