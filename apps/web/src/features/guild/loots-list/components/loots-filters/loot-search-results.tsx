import { NpcSearchTile, PlayerSearchTile } from "@/components/tiles";
import { formatLevel } from "@lootlog/domain/profession";
import { LOOT_RARITY_TEXT_CLASS } from "@/features/guild/loots-list/loot-rarity-colors";
import { CommandGroup, CommandItem } from "@lootlog/ui/components/command";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import * as m from "framer-motion/m";
import { containerVariants, renderIf } from "./loot-search-presentation";
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
>;

export const LootSearchResults = ({
  npcResults,
  t,
  handleSelectNpc,
  itemResults,
  handleSelectItem,
  playerResults,
  handleSelectPlayer,
}: Props) => (
  <m.div
    key="search-results"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
  >
    {renderIf(
      npcResults.length > 0,
      <CommandGroup heading={t("loots.searchCommand.npcs")}>
        {npcResults.map((npc) => (
          <CommandItem
            key={`npc-${npc.name}`}
            value={`npc-${npc.name}`}
            onSelect={() => handleSelectNpc(npc)}
            className="h-14 min-h-14 rounded-lg px-3 py-1.5"
          >
            <NpcSearchTile icon={npc.icon} name={npc.name} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{npc.name}</div>
              <div className="text-xs text-muted-foreground">
                {t(`npcType.${npc.type}`)}
              </div>
            </div>
            {npc.lvl > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("loots.searchCommand.level", {
                  level: formatLevel(npc.lvl, npc.prof),
                })}
              </span>
            )}
          </CommandItem>
        ))}
      </CommandGroup>,
    )}

    {renderIf(
      itemResults.length > 0,
      <CommandGroup heading={t("loots.searchCommand.items")}>
        {itemResults.map((item) => (
          <CommandItem
            key={`item-${item.name}`}
            value={`item-${item.name}`}
            onSelect={() => handleSelectItem(item)}
            className="h-14 min-h-14 rounded-lg px-3 py-1.5"
          >
            <ItemImage
              icon={item.icon}
              rarity={resolveItemRarity(item.rarity)}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{item.name}</div>
              {item.rarity && (
                <div
                  className={cn(
                    "text-xs font-semibold",
                    LOOT_RARITY_TEXT_CLASS[resolveItemRarity(item.rarity)],
                  )}
                >
                  {t(`itemRarity.${item.rarity}`, {
                    defaultValue: item.rarity,
                  })}
                </div>
              )}
            </div>
            {item.lvl > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("loots.searchCommand.level", {
                  level: item.lvl,
                })}
              </span>
            )}
          </CommandItem>
        ))}
      </CommandGroup>,
    )}

    {renderIf(
      playerResults.length > 0,
      <CommandGroup heading={t("loots.searchCommand.players")}>
        {playerResults.map((player) => (
          <CommandItem
            key={`player-${player.id}`}
            value={`player-${player.id}`}
            onSelect={() => handleSelectPlayer(player)}
            className="h-14 min-h-14 rounded-lg px-3 py-1.5"
          >
            <PlayerSearchTile
              icon={player.icon}
              name={player.name}
              className="scale-75"
            />
            <span className="truncate font-semibold">{player.name}</span>
          </CommandItem>
        ))}
      </CommandGroup>,
    )}
  </m.div>
);
