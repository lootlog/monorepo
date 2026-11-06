import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSkillTree } from "@/hooks/use-skill-tree";
import { useLoadedWornItems } from "@/hooks/use-worn-items";
import { sumItemStats } from "@/lib/item-stat-totals";
import { sumSkillBonuses } from "@/lib/skills/skill-stats";
import { wornSkillWeapons } from "@/lib/skills/skill-tree";

/**
 * The set as worn, its stats added up and what its learned skills add. A
 * change counts as the User's once the set has loaded: loading it shows its
 * stats, not a gain.
 */
export const useSetSummary = () => {
  const { set } = useEquipmentSet();
  const { wornItems, isLoaded } = useLoadedWornItems();
  const { data: tree, isPending } = useSkillTree(set.profession);
  const weapons = wornSkillWeapons(wornItems);

  return {
    wornItems,
    totals: sumItemStats([...wornItems.values()].map(({ item }) => item.stat)),
    skillBonuses: sumSkillBonuses(tree ?? [], set.skills, set.level, weapons),
    weapons,
    isLoaded: isLoaded && (set.profession === null || !isPending),
  };
};
