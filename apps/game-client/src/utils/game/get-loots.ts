import { LootDto } from "@/hooks/api/use-create-loot";
import { ItemEvent } from "@/types/margonem/game-events/item";
import { getItemRarity } from "@/utils/game/get-item-rarity";

export const getLoot = (items: ItemEvent = {}): LootDto[] => {
  const loots = Object.values(items).reduce((acc: LootDto[], item) => {
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
