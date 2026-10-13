import { NpcSearchTile, PlayerSearchTile } from "@/components/tiles";
import { formatLevel } from "@lootlog/domain/profession";
import { LOOT_RARITY_TEXT_CLASS } from "@/features/guild/loots-list/loot-rarity-colors";
import { CommandGroup, CommandItem } from "@lootlog/ui/components/command";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import { upperFirst } from "es-toolkit";
import * as m from "framer-motion/m";
import {
  containerVariants,
  getPlayerRowValue,
  isInScope,
  renderIf,
  SEARCH_ROW_CLASS_NAME,
  type GuildSearchScope,
} from "./loot-search-presentation";
import { SearchRowEnterHint } from "./search-row-enter-hint";
import type { useLootSearchCommand } from "./use-loot-search-command";

type Props = Pick<
  ReturnType<typeof useLootSearchCommand>,
  | "npcResults"
  | "t"
  | "handleSelectNpc"
  | "itemResults"
  | "handleSelectItem"
  | "playerResults"
  | "handleSelectPlayer"
  | "world"
> & { scope: GuildSearchScope };

export const LootSearchResults = ({
  npcResults,
  t,
  handleSelectNpc,
  itemResults,
  handleSelectItem,
  playerResults,
  handleSelectPlayer,
  world,
  scope,
}: Props) => (
  <m.div
    key="search-results"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
  >
    {renderIf(
      npcResults.length > 0 && isInScope(scope, "npcs"),
      <CommandGroup heading={t("loots.searchCommand.npcs")}>
        {npcResults.map((npc) => (
          <CommandItem
            key={`npc-${npc.name}`}
            value={`npc-${npc.name}`}
            onSelect={() => handleSelectNpc(npc)}
            className={SEARCH_ROW_CLASS_NAME}
          >
            <NpcSearchTile icon={npc.icon} name={npc.name} />
            <span className="min-w-0 truncate font-medium">{npc.name}</span>
            <span className="shrink-0 text-muted-foreground">
              {t(`npcType.${npc.type}`)}
            </span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums max-sm:hidden">
              {npc.lvl > 0 &&
                t("loots.searchCommand.level", {
                  level: formatLevel(npc.lvl, npc.prof),
                })}
            </span>
            <SearchRowEnterHint />
          </CommandItem>
        ))}
      </CommandGroup>,
    )}

    {renderIf(
      itemResults.length > 0 && isInScope(scope, "items"),
      <CommandGroup heading={t("loots.searchCommand.items")}>
        {itemResults.map((item) => (
          <CommandItem
            key={`item-${item.name}`}
            value={`item-${item.name}`}
            onSelect={() => handleSelectItem(item)}
            className={SEARCH_ROW_CLASS_NAME}
          >
            <ItemImage
              icon={item.icon}
              rarity={resolveItemRarity(item.rarity)}
            />
            <span className="min-w-0 truncate font-medium">{item.name}</span>
            {item.rarity && (
              <span
                className={cn(
                  "shrink-0",
                  LOOT_RARITY_TEXT_CLASS[resolveItemRarity(item.rarity)],
                )}
              >
                {t(`itemRarity.${item.rarity}`, {
                  defaultValue: item.rarity,
                })}
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums max-sm:hidden">
              {item.lvl > 0 &&
                t("loots.searchCommand.level", { level: item.lvl })}
            </span>
            <SearchRowEnterHint />
          </CommandItem>
        ))}
      </CommandGroup>,
    )}

    {renderIf(
      playerResults.length > 0 && isInScope(scope, "players"),
      <CommandGroup
        heading={
          world
            ? t("loots.searchCommand.playersOnWorld", {
                world: upperFirst(world),
              })
            : t("loots.searchCommand.players")
        }
      >
        {playerResults.map((player) => (
          <CommandItem
            key={getPlayerRowValue(player)}
            value={getPlayerRowValue(player)}
            onSelect={() => handleSelectPlayer(player)}
            className={SEARCH_ROW_CLASS_NAME}
          >
            <PlayerSearchTile
              icon={player.icon}
              name={player.name}
              className="mr-0 scale-75"
            />
            <span className="min-w-0 truncate font-medium">{player.name}</span>
            {!world && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {upperFirst(player.world)}
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums max-sm:hidden">
              {player.lvl > 0 &&
                t("loots.searchCommand.level", {
                  level: formatLevel(player.lvl, player.prof),
                })}
            </span>
            <SearchRowEnterHint />
          </CommandItem>
        ))}
      </CommandGroup>,
    )}
  </m.div>
);
