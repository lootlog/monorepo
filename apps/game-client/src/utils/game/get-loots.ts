import type { LootDto } from "@/hooks/api/use-create-loot";
import type { ItemEvent } from "@/types/margonem/game-events/item";
import type { LootEvent } from "@/types/margonem/game-events/loot";
import { getItemRarity } from "@/utils/game/get-item-rarity";

export const getLoot = (items: ItemEvent = {}, loot: LootEvent): LootDto[] => {
  const lootItemKeys = Object.keys(loot.states || {});

  const loots = Object.entries(items).reduce((acc: LootDto[], [key, item]) => {
    if (!lootItemKeys.includes(key)) return acc;

    const { hid, icon, name, pr, prc, stat, cl, tpl, loc, own } = item;
    const rarity = getItemRarity(stat);

    if (rarity && (loc === "l" || loc === "k") && rarity !== "common") {
      acc.push({
        id: tpl,
        hid,
        icon,
        name,
        own,
        pr,
        prc,
        stat,
        cl,
      });
    }

    return acc;
  }, []);

  return loots;
};
