import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { itemForCharacter } from "@lootlog/domain/elastic-level";

export const useItemForCharacter = <
  Item extends Parameters<typeof itemForCharacter>[0],
>(
  item: Item,
  maxLevel?: number,
) => {
  const { set } = useEquipmentSet();

  const level =
    maxLevel === undefined
      ? set.level
      : Math.min(set.level ?? maxLevel, maxLevel);

  return itemForCharacter(item, level);
};
