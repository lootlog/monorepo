import { isLootDrawItem } from "@lootlog/domain/loot-draw";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Item, Loot } from "@/lib/loots/loot-types";

export const useLootDrawRules = () => {
  const guildId = useGuildId();

  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  const canDraw = (loot: Loot, item: Item) =>
    guild !== undefined &&
    isLootDrawItem(loot, item, guild.lootDrawExcludedNpcTypes);

  const showsDraw = (loot: Loot, item: Item) =>
    canDraw(loot, item) ||
    loot.standingDraws.some(({ itemHid }) => itemHid === item.hid);

  return { canDraw, showsDraw };
};
