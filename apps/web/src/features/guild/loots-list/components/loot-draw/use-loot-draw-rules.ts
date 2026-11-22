import { isLootDrawItem } from "@lootlog/domain/loot-draw";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { useCanManageLoots } from "@/features/guild/loots-list/use-can-manage-loots";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Item, Loot } from "@/lib/loots/loot-types";

/**
 * Whether the viewer may draw the item, and whether its draw shows. Only loot
 * managers draw, and only items the open Organization draws; nothing is
 * drawn until its settings load, so an excluded boss never flashes a wheel.
 * Everyone who sees the loot sees a standing result, even after its NPC type
 * is excluded, so it can still be read and voided.
 */
export const useLootDrawRules = () => {
  const guildId = useGuildId();

  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  const canManage = useCanManageLoots();

  const drawsItem = (loot: Loot, item: Item) =>
    guild !== undefined &&
    isLootDrawItem(loot, item, guild.lootDrawExcludedNpcTypes);

  const canDraw = (loot: Loot, item: Item) =>
    canManage && drawsItem(loot, item);

  const showsDraw = (loot: Loot, item: Item) =>
    canDraw(loot, item) ||
    loot.standingDraws.some(({ itemHid }) => itemHid === item.hid);

  return { canDraw, showsDraw };
};
