import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { Card } from "@lootlog/ui/components/card";
import {
  ITEM_RARITY_STYLES,
  ItemTileDetails,
} from "@lootlog/ui/components/item-tile-details";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { CompareButton } from "@/components/comparison/compare-button";
import { EquipButton } from "@/components/equipment/equip-button";
import {
  ItemDropSources,
  MAX_HEADER_DROP_SOURCES,
} from "@/components/items/item-drop-sources";
import { ItemHero } from "@/components/items/item-hero";
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
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
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

  // A few sources sit beside the name; more, or an item with no upgrade
  // section, give them a section of their own.
  const sourcesInHero =
    canUpgrade && item.droppedBy.length <= MAX_HEADER_DROP_SOURCES;

  const dropSources = sourcesInHero ? null : (
    <ItemDropSources sources={item.droppedBy} variant="section" />
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-6 py-6",
        ITEM_RARITY_STYLES[rarity].accent,
      )}
    >
      <ItemHero
        item={looted}
        upgrade={upgrade.level}
        withDropSources={sourcesInHero}
        actions={
          <>
            <EquipButton item={item} upgrade={upgrade} />
            <CompareButton item={item} upgrade={upgrade} />
          </>
        }
      />

      {canUpgrade ? dropSources : null}

      <div
        className={cn(
          "grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] xl:gap-8",
          // Monster cards fit beside the tooltip sooner than the upgrade does.
          !canUpgrade && "sm:grid-cols-[18rem_minmax(0,1fr)]",
        )}
      >
        <aside
          aria-label={t("item.inGame")}
          // The in-game tooltip stays as narrow as in the game.
          className="flex flex-col gap-2 sm:max-w-80 lg:sticky lg:top-20"
        >
          <p className="text-xs text-muted-foreground">{t("item.inGame")}</p>
          <Card className="gap-0 overflow-hidden border-[color-mix(in_oklab,var(--item-rarity)_40%,var(--border))] p-0">
            <ItemTileDetails
              color=""
              icon={item.icon}
              labels={ITEM_TILE_LABELS}
              name={item.name}
              rarity={rarity}
              renderStat={renderStatChanges(looted.stat, stat)}
              stat={stat}
              type={item.type ?? ""}
            />
          </Card>
          {!canUpgrade && findEquipmentSlot(item.type) ? (
            <p className="text-xs text-muted-foreground">
              {t("upgrade.notUpgradable")}
            </p>
          ) : null}
        </aside>

        <div className="flex flex-col gap-8">
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
          ) : (
            dropSources
          )}
        </div>
      </div>
    </div>
  );
}
