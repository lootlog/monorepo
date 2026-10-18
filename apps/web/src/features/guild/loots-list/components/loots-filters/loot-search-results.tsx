import { CommandGroup, CommandItem } from "@lootlog/ui/components/command";
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
import { LootSearchHitContent } from "./loot-search-hit-content";
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
            <LootSearchHitContent hit={{ kind: "npc", npc }} />
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
            <LootSearchHitContent hit={{ kind: "item", item }} />
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
            <LootSearchHitContent hit={{ kind: "player", player, world }} />
            <SearchRowEnterHint />
          </CommandItem>
        ))}
      </CommandGroup>,
    )}
  </m.div>
);
