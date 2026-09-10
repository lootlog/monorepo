import { NpcSearchTile, PlayerSearchTile } from "@/components/tiles";
import { ITEM_RARITY_NAMES, NPC_TYPE_NAMES } from "@/constants/npc";
import { CommandGroup, CommandItem } from "@lootlog/ui/components/command";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { cn } from "cn";
import * as m from "framer-motion/m";
import {
  containerVariants,
  getRarityStyle,
  renderIf,
} from "./loot-search-presentation";
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
  <>
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
              key={`npc-${npc.id}`}
              value={`npc-${npc.id}`}
              onSelect={() => handleSelectNpc(npc)}
              className="h-14 min-h-14 rounded-lg px-3 py-1.5"
            >
              <NpcSearchTile icon={npc.icon} name={npc.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{npc.name}</div>
                <div className="text-xs text-muted-foreground">
                  {NPC_TYPE_NAMES[npc.type]}
                </div>
              </div>
              {npc.lvl > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("loots.searchCommand.level", {
                    level: npc.lvl,
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
              key={`item-${item.id}`}
              value={`item-${item.id}`}
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
                      getRarityStyle(item.rarity),
                    )}
                  >
                    {ITEM_RARITY_NAMES.get(item.rarity) ?? item.rarity}
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
    ,
  </>
);
