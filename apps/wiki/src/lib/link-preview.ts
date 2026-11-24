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
import { PUBLIC_SITE_ORIGINS } from "@lootlog/domain/public-sites";
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

export const canonicalLink = (path: string) => ({
  rel: "canonical",
  href: `${PUBLIC_SITE_ORIGINS.wiki}${path}`,
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
