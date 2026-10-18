import { NpcSearchTile, PlayerSearchTile } from "@/components/tiles";
import { formatLevel } from "@lootlog/domain/profession";
import { LOOT_RARITY_TEXT_CLASS } from "@/features/guild/loots-list/loot-rarity-colors";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { ItemRarity } from "@/lib/loots/loot-types";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import { DatabaseZap } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { useLootSearchCommand } from "./use-loot-search-command";

type SearchState = ReturnType<typeof useLootSearchCommand>;

export type LootSearchHit =
  | { kind: "npc"; npc: SearchState["npcResults"][number] }
  | { kind: "item"; item: SearchState["itemResults"][number] }
  | {
      kind: "player";
      player: SearchState["playerResults"][number];
      /** The selected world, which every listed player then shares. */
      world: string | null;
    }
  | { kind: "hid"; item: NonNullable<SearchState["hidItem"]>; term: string }
  | { kind: "direct"; term: string };

/**
 * One loot search hit as the palette and the loot list's search bar show it,
 * inside whichever row element each of them selects it with.
 */
export const LootSearchHitContent = ({ hit }: { hit: LootSearchHit }) => {
  const { t } = useTranslation();

  switch (hit.kind) {
    case "npc":
      return (
        <>
          <NpcSearchTile icon={hit.npc.icon} name={hit.npc.name} />
          <span className="min-w-0 truncate font-medium">{hit.npc.name}</span>
          <span className="shrink-0 text-muted-foreground">
            {t(`npcType.${hit.npc.type}`)}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums max-sm:hidden">
            {hit.npc.lvl > 0 &&
              t("loots.searchCommand.level", {
                level: formatLevel(hit.npc.lvl, hit.npc.prof),
              })}
          </span>
        </>
      );
    case "item":
      return (
        <>
          <ItemImage
            icon={hit.item.icon}
            rarity={resolveItemRarity(hit.item.rarity)}
          />
          <span className="min-w-0 truncate font-medium">{hit.item.name}</span>
          {hit.item.rarity && (
            <span
              className={cn(
                "shrink-0",
                LOOT_RARITY_TEXT_CLASS[resolveItemRarity(hit.item.rarity)],
              )}
            >
              {t(`itemRarity.${hit.item.rarity}`, {
                defaultValue: hit.item.rarity,
              })}
            </span>
          )}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums max-sm:hidden">
            {hit.item.lvl > 0 &&
              t("loots.searchCommand.level", { level: hit.item.lvl })}
          </span>
        </>
      );
    case "player":
      return (
        <>
          <PlayerSearchTile
            icon={hit.player.icon}
            name={hit.player.name}
            className="mr-0 scale-75"
          />
          <span className="min-w-0 truncate font-medium">
            {hit.player.name}
          </span>
          {!hit.world && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {upperFirst(hit.player.world)}
            </span>
          )}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums max-sm:hidden">
            {hit.player.lvl > 0 &&
              t("loots.searchCommand.level", {
                level: formatLevel(hit.player.lvl, hit.player.prof),
              })}
          </span>
        </>
      );
    case "hid":
      return (
        <>
          <ItemImage
            icon={hit.item.icon}
            rarity={hit.item.rarity ?? ItemRarity.COMMON}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">
              {hit.item.name}
            </span>
            <code className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
              {hit.term}
            </code>
          </span>
        </>
      );
    case "direct":
      return (
        <>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10">
            <DatabaseZap className="size-4! text-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {t("loots.searchCommand.directSearch", { term: hit.term })}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {t("loots.searchCommand.directSearchHint")}
            </span>
          </span>
        </>
      );
  }
};
