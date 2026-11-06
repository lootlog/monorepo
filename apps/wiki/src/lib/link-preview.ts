import type {
  CatalogItemDtoOutput,
  CatalogNpcDtoOutput,
} from "@lootlog/client/search";
import { itemForCharacter } from "@lootlog/domain/elastic-level";
import {
  isUpgradable,
  type ItemUpgrade,
  upgradeItemStat,
} from "@lootlog/domain/item-upgrade";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { itemIconUrl } from "@lootlog/ui/components/item-image";
import {
  ITEM_STAT_FOOTER_SECTIONS,
  mapStatsToDisplaySections,
  parseItemStats,
} from "@lootlog/ui/components/item-stat-utils";
import {
  ITEM_RARITIES_BY_VALUE,
  type ItemRarity,
  resolveItemRarity,
} from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_COLORS } from "@lootlog/ui/lib/item-rarity-colors";
import { sortBy } from "es-toolkit";
import { t } from "@/i18n/messages";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import { itemStatText } from "@/lib/item-stat-text";
import { monsterIdentity } from "@/lib/group-items-by-monster";
import { npcSummary } from "@/lib/npc-summary";

/**
 * The production wiki, which search results and previews name as each page's
 * address; development hosts point at it too.
 */
export const WIKI_ORIGIN = "https://wiki.lootlog.pl";

/** The address search engines should index a page under, without its options. */
export const canonicalLink = (path: string) => ({
  rel: "canonical",
  href: `${WIKI_ORIGIN}${path}`,
});

// Common and upgraded items keep the chat's own edge.
const RARITY_COLORS: Partial<Record<ItemRarity, string>> = LOOT_RARITY_COLORS;

// Discord shows a few names before the line grows past its preview.
const LISTED_NAMES = 4;

type LinkPreview = {
  title: string;
  /** Lines, as the in-game tooltip shows them. */
  lines: readonly string[];
  image?: string;
  /** Discord colours the preview's edge with it. */
  color?: string;
};

// A monster's catalog identities share its name, so names list once.
const listNames = (names: readonly string[]) => {
  const unique = [...new Set(names)];
  const hidden = unique.length - LISTED_NAMES;
  const listed = unique.slice(0, LISTED_NAMES).join(", ");

  return hidden > 0 ? `${listed} +${hidden}` : listed;
};

/**
 * The page's title, and the Open Graph tags Discord and other chats read to
 * unfurl its link without running the page.
 */
export const linkPreviewMeta = ({
  title,
  lines,
  image,
  color,
}: LinkPreview) => {
  const description = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return [
    { title: `${title} | ${t("meta.title")}` },
    { name: "description", content: description },
    { property: "og:site_name", content: t("meta.title") },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    ...(image
      ? [
          { property: "og:image", content: image },
          { name: "twitter:card", content: "summary" },
        ]
      : []),
    ...(color ? [{ name: "theme-color", content: color }] : []),
  ];
};

/**
 * An item's preview as its tooltip on the page: what it is, its stats at
 * the linked upgrade and level, and the monsters it drops from.
 */
export const itemLinkPreview = (
  item: CatalogItemDtoOutput,
  {
    characterLevel,
    upgrade,
  }: { characterLevel?: number; upgrade: ItemUpgrade },
): LinkPreview => {
  const looted = itemForCharacter(item, characterLevel ?? null);
  const shown = isUpgradable(looted) ? upgrade.level : 0;
  const stat = shown > 0 ? upgradeItemStat(looted, upgrade) : looted.stat;
  const rarity = resolveItemRarity(item.rarity);

  const stats = mapStatsToDisplaySections(parseItemStats(stat))
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

/**
 * A monster's preview: its kind and level, where it is fought, and its most
 * valuable current drops.
 */
export const npcLinkPreview = (
  npc: CatalogNpcDtoOutput,
  drops: readonly CatalogItemDtoOutput[],
): LinkPreview => {
  const current = drops.filter(
    (item) =>
      !item.droppedBy.some(
        (source) =>
          source.retired && monsterIdentity(source) === monsterIdentity(npc),
      ),
  );

  // Drops come highest level first; the stable sort keeps that per rarity.
  const valuable = sortBy(current, [
    (item) => ITEM_RARITIES_BY_VALUE.indexOf(resolveItemRarity(item.rarity)),
  ]);

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
