import {
  Navigate,
  createFileRoute,
  linkOptions,
  notFound,
  redirect,
} from "@tanstack/react-router";
import {
  getCatalogControllerGetItemsQueryOptions,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import { itemIconUrl } from "@lootlog/domain/margonem-cdn";
import { ITEM_RARITY_STYLES } from "@lootlog/ui/lib/item-rarity-colors";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { cn } from "cn";
import { ItemNotFound } from "@/components/items/item-not-found";
import { CompareButton } from "@/components/comparison/compare-button";
import { EquipButton } from "@/components/equipment/equip-button";
import { PageBreadcrumbs } from "@/components/article/page-breadcrumbs";
import { ReportButton } from "@/components/reports/report-button";
import { ItemDropSources } from "@/components/items/item-drop-sources";
import { ItemEventLinks } from "@/components/items/item-event-links";
import { ItemPageTooltip } from "@/components/items/item-page-tooltip";
import { ItemRelatedDrops } from "@/components/items/item-related-drops";
import { ItemRevisions } from "@/components/items/item-revisions";
import { ItemElasticLevelSection } from "@/components/items/item-elastic-level-section";
import { ItemUpgradeSection } from "@/components/items/item-upgrade-section";
import { ItemSocketSections } from "@/components/items/item-socket-sections";
import {
  keepFittingSymbol,
  socketItemsQuery,
  useSocketCatalog,
} from "@/hooks/use-socket-items";
import { renderStatChanges } from "@/components/render-stat-changes";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useStickyTop } from "@/hooks/use-sticky-top";
import { t } from "@/i18n/messages";
import {
  type ItemPageSearch,
  itemPageParams,
  itemPageSearch,
  readPageSegment,
} from "@/lib/catalog-links";
import {
  itemPageQuery,
  prefetchPageQueries,
  relatedDropsQuery,
  relatedDropsSource,
} from "@/lib/catalog-page-queries";
import { itemLinkPreview, linkPreviewHead } from "@/lib/link-preview";
import { itemForCharacter } from "@lootlog/domain/elastic-level";
import { isCharacterLevel } from "@/lib/equipment-set";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import {
  decodeItemUpgrade,
  isUpgradable,
  type ItemUpgrade,
  NO_UPGRADE,
  upgradeItemStat,
} from "@lootlog/domain/item-upgrade";
import { findStatChanges } from "@/lib/stat-changes";
import {
  findChest,
  findComponent,
  findSymbol,
  hasSocket,
} from "@lootlog/domain/item-socket";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

export const Route = createFileRoute("/items_/$itemSlug")({
  component: ItemRoute,
  loader: async ({ params, location, context: { queryClient } }) => {
    const id = readPageSegment(params.itemSlug)?.id;

    if (id === undefined) throw notFound();

    const data = await queryClient
      .ensureQueryData(
        getCatalogControllerGetItemsQueryOptions(itemPageQuery(id)),
      )
      .catch(() => undefined);

    if (!data) return { item: undefined };

    const item = data.hits[0];

    if (!item) throw notFound();

    if (itemPageParams(item).itemSlug !== params.itemSlug) {
      throw redirect({
        to: "/items/$itemSlug",
        params: itemPageParams(item),
        search: location.search,
        statusCode: 301,
      });
    }

    const source = relatedDropsSource(item);

    const showsSocketItems =
      hasSocket(item) ||
      findSymbol(item.id) !== undefined ||
      findComponent(item.id) !== undefined ||
      findChest(item.id) !== undefined;

    await prefetchPageQueries(
      source
        ? queryClient.prefetchQuery(
            getCatalogControllerGetItemsQueryOptions(
              relatedDropsQuery(source.key),
            ),
          )
        : Promise.resolve(),
      showsSocketItems
        ? queryClient.prefetchQuery(
            getCatalogControllerGetItemsQueryOptions(socketItemsQuery),
          )
        : Promise.resolve(),
    );

    return { item };
  },
  head: ({ loaderData, match }) =>
    loaderData?.item
      ? linkPreviewHead(
          itemLinkPreview(loaderData.item, {
            characterLevel: match.search.level,
            upgrade: searchedUpgrade(match.search),
          }),
          {
            path: `/items/${itemPageParams(loaderData.item).itemSlug}`,
            section: { name: t("navigation.items"), path: "/items" },
          },
        )
      : { meta: [{ title: `${t("meta.itemTitle")} | ${t("meta.title")}` }] },
  notFoundComponent: ItemNotFound,
  validateSearch: (search: {
    upgrade?: unknown;
    bonus?: unknown;
    symbol?: unknown;
    level?: unknown;
  }): ItemPageSearch => {
    const characterLevel = Number(search.level);

    const upgrade = decodeItemUpgrade(
      String(search.upgrade ?? ""),
      String(search.bonus ?? ""),
      String(search.symbol ?? ""),
    );

    const validated = itemPageSearch(upgrade ?? NO_UPGRADE);

    if (isCharacterLevel(characterLevel)) validated.level = characterLevel;

    return validated;
  },
});

const searchedUpgrade = ({
  upgrade,
  bonus,
  symbol,
}: ItemPageSearch): ItemUpgrade => ({ level: upgrade ?? 0, bonus, symbol });

function ItemRoute() {
  const tooltipSticky = useStickyTop();
  const { itemSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { set } = useEquipmentSet();
  const id = readPageSegment(itemSlug)?.id;
  const { items: symbols } = useSocketCatalog(search.symbol !== undefined);

  const { data, isError } = useCatalogControllerGetItems(
    itemPageQuery(id ?? 0),
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
    return <ItemNotFound />;
  }

  if (!item) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-12 w-96 max-w-full" />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full max-w-sm rounded-xl max-lg:order-first" />
        </div>
      </div>
    );
  }

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

  const looted = itemForCharacter(item, search.level ?? set.level);
  const canUpgrade = isUpgradable(looted);

  const upgrade = canUpgrade
    ? keepFittingSymbol(looted, searchedUpgrade(search), symbols)
    : NO_UPGRADE;

  const stat = upgradeItemStat(looted, upgrade);
  const rarity = resolveItemRarity(item.rarity);
  const styles = ITEM_RARITY_STYLES[rarity];
  const typeLabel = item.type ? ITEM_TILE_LABELS.type[item.type] : undefined;
  const slot = findEquipmentSlot(item.type);

  const showUpgrade = (next: ItemUpgrade) =>
    void navigate({
      replace: true,
      resetScroll: false,
      search: (prev) => ({ ...itemPageSearch(next), level: prev.level }),
    });

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

      <PortalPageHeader
        media={
          <span className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--item-rarity)_45%,var(--border))] bg-[radial-gradient(60%_60%_at_50%_50%,color-mix(in_oklab,var(--item-rarity)_25%,var(--background)),var(--background))] md:size-20">
            <img
              src={itemIconUrl(item.icon)}
              alt=""
              width={64}
              height={64}
              className="size-12 [image-rendering:pixelated] md:size-16"
            />
          </span>
        }
        eyebrow={
          <p>
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
        }
        title={item.name}
        actions={
          <div
            role="group"
            aria-label={t("item.actions")}
            className="flex flex-wrap gap-2"
          >
            <EquipButton item={item} upgrade={upgrade} />
            <CompareButton item={item} upgrade={upgrade} />
            <ReportButton
              subjectType="ITEM"
              subjectId={item.id}
              name={item.name}
            />
          </div>
        }
      />

      <ItemEventLinks stat={item.stat} />

      <div className="grid items-start gap-x-8 gap-y-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div
          {...tooltipSticky}
          className="w-full max-w-sm lg:sticky lg:col-start-2 lg:row-start-1"
        >
          <ItemPageTooltip
            item={looted}
            stat={stat}
            renderStat={renderStatChanges(looted.stat, stat)}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-12 lg:col-start-1 lg:row-start-1">
          <ItemDropSources sources={item.droppedBy} />
          <ItemElasticLevelSection
            item={item}
            level={looted.lvl}
            previewLevel={search.level}
            onPreviewLevelChange={(level) =>
              void navigate({
                replace: true,
                resetScroll: false,
                search: (prev) => ({ ...prev, level }),
              })
            }
          />
          {canUpgrade ? (
            <ItemUpgradeSection
              item={looted}
              upgrade={upgrade}
              changes={findStatChanges(looted.stat, stat)}
              onChange={showUpgrade}
            />
          ) : slot ? (
            <p className="text-sm text-muted-foreground">
              {t("upgrade.notUpgradable")}
            </p>
          ) : null}
          <ItemSocketSections
            item={looted}
            upgrade={upgrade}
            onChange={showUpgrade}
          />
          <ItemRevisions item={item} />
          <ItemRelatedDrops item={item} />
        </div>
      </div>
    </article>
  );
}
