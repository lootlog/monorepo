import { parseItemStatEntries } from "@lootlog/domain/item-stat";
import type {
  CatalogItemDtoOutput,
  CatalogNpcDtoOutput,
} from "@lootlog/client/catalog";
import { itemForCharacter } from "@lootlog/domain/elastic-level";
import {
  isUpgradable,
  type ItemUpgrade,
  upgradeItemStat,
} from "@lootlog/domain/item-upgrade";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import {
  LOOTLOG_SOCIAL_IMAGE,
  PUBLIC_SITE_ORIGINS,
  publicPageHead,
} from "@lootlog/domain/public-sites";
import { itemIconUrl } from "@lootlog/domain/margonem-cdn";
import {
  ITEM_STAT_FOOTER_SECTIONS,
  mapStatsToDisplaySections,
} from "@lootlog/ui/components/item-stat-utils";
import {
  itemRarityRank,
  type DisplayItemRarity,
  resolveItemRarity,
} from "@lootlog/domain/item-rarity";
import { LOOT_RARITY_COLORS } from "@lootlog/ui/lib/item-rarity-colors";
import { sortBy } from "es-toolkit";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import { itemStatText } from "@lootlog/ui/lib/item-stat-text";
import { isRetiredDropOf } from "@/lib/group-items-by-monster";
import { npcSummary } from "@/lib/npc-summary";

type Breadcrumb = { name: string; path: string };

const wikiUrl = (path: string) => `${PUBLIC_SITE_ORIGINS.wiki}${path}`;

const breadcrumbScript = (trail: readonly Breadcrumb[]) => ({
  type: "application/ld+json",
  children: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: t("navigation.home"), path: "/" }, ...trail].map(
      ({ name, path }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name,
        item: wikiUrl(path),
      }),
    ),
  }),
});

export const wikiPageHead = ({
  path,
  title,
  documentTitle = title,
  description,
  noindex,
  breadcrumbs,
}: {
  path: string;
  title: string;
  documentTitle?: string;
  description: string;
  noindex?: boolean;
  breadcrumbs?: readonly Breadcrumb[];
}) => ({
  ...publicPageHead({
    url: wikiUrl(path),
    siteName: t("meta.title"),
    title,
    documentTitle: `${documentTitle} | ${t("meta.title")}`,
    description,
    image: { ...LOOTLOG_SOCIAL_IMAGE, alt: t("meta.title") },
    noindex,
  }),
  scripts: breadcrumbs ? [breadcrumbScript(breadcrumbs)] : [],
});

const RARITY_COLORS: Partial<Record<DisplayItemRarity, string>> =
  LOOT_RARITY_COLORS;

const LISTED_NAMES = 4;

type LinkPreview = {
  title: string;
  lines: readonly string[];
  image?: string;
  color?: string;
};

const listNames = (names: readonly string[]) => {
  const unique = [...new Set(names)];
  const hidden = unique.length - LISTED_NAMES;
  const listed = unique.slice(0, LISTED_NAMES).join(", ");

  return hidden > 0 ? `${listed} +${hidden}` : listed;
};

export const linkPreviewHead = (
  { title, lines, image, color }: LinkPreview,
  { path, section }: { path: string; section: Breadcrumb },
) => {
  const description = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  const head = publicPageHead({
    url: wikiUrl(path),
    siteName: t("meta.title"),
    title,
    documentTitle: `${t("meta.gameTitle", { name: title })} | ${t("meta.title")}`,
    description,
    image: image
      ? { url: image, alt: title }
      : { ...LOOTLOG_SOCIAL_IMAGE, alt: t("meta.title") },
  });

  return {
    ...head,
    meta: [
      ...head.meta,
      ...(color ? [{ name: "theme-color", content: color }] : []),
    ],
    scripts: [breadcrumbScript([section, { name: title, path }])],
  };
};

export const itemLinkPreview = (
  item: CatalogItemDtoOutput,
  {
    characterLevel,
    upgrade,
  }: { characterLevel?: number; upgrade: ItemUpgrade },
): LinkPreview => {
  const looted = itemForCharacter(item, characterLevel ?? null);
  const shown = isUpgradable(looted) ? upgrade.level : 0;
  const stat = upgradeItemStat(looted, upgrade);
  const rarity = resolveItemRarity(item.rarity);

  const stats = mapStatsToDisplaySections(parseItemStatEntries(stat))
    .filter(({ index }) => !ITEM_STAT_FOOTER_SECTIONS.has(index))
    .flatMap(({ values }) => values.map(itemStatText));

  const sources = item.droppedBy
    .filter(({ retired }) => !retired)
    .map(({ name }) => name);

  return {
    title: shown > 0 ? `${item.name} +${shown}` : item.name,
    lines: [
      [
        ITEM_TILE_LABELS.rarity[rarity],
        item.type ? ITEM_TILE_LABELS.type[item.type] : undefined,
        looted.lvl > 0
          ? t("common.levelShort", { level: looted.lvl })
          : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      ...stats,
      sources.length > 0
        ? t("linkPreview.droppedBy", { names: listNames(sources) })
        : "",
    ],
    image: itemIconUrl(item.icon),
    color: RARITY_COLORS[rarity],
  };
};

export const npcLinkPreview = (
  npc: CatalogNpcDtoOutput,
  drops: readonly CatalogItemDtoOutput[],
): LinkPreview => {
  const current = drops.filter((item) => !isRetiredDropOf(item, npc));

  const valuable = sortBy(current, [({ rarity }) => itemRarityRank(rarity)]);

  return {
    title: npc.name,
    lines: [
      npcSummary(npc),
      npc.locations.length > 0
        ? t("linkPreview.locations", {
            names: listNames(npc.locations.map(({ map }) => map)),
          })
        : "",
      valuable.length > 0
        ? t("linkPreview.drops", {
            names: listNames(valuable.map(({ name }) => name)),
          })
        : "",
    ],
    image: npc.icon ? npcIconUrl(npc.icon) : undefined,
  };
};
