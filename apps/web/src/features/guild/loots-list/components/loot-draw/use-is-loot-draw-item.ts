import { isLootDrawItem } from "@lootlog/domain/loot-draw";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Item, Loot } from "@/lib/loots/loot-types";

/**
 * Whether the open Organization draws the item. Nothing is drawn until its
 * settings load, so an excluded boss never flashes a wheel.
 */
export const useIsLootDrawItem = () => {
  const guildId = useGuildId();

  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  return (loot: Loot, item: Item) =>
    guild !== undefined &&
    isLootDrawItem(loot, item, guild.lootDrawExcludedNpcTypes);
};
