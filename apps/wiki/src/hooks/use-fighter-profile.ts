import { useSkillTree } from "@/hooks/use-skill-tree";
import { useSetWornItems } from "@/hooks/use-worn-items";
import type { EquipmentSet } from "@/lib/equipment-set";
import { fighterProfile } from "@/lib/fight/fighter-profile";
import { SKILL_LEVEL_CAP, wornSkillWeapons } from "@/lib/skills/skill-tree";

export const useFighterProfile = (set: EquipmentSet) => {
  const { wornItems, isLoaded } = useSetWornItems(set);
  const { data: tree, isPending } = useSkillTree(set.profession);

  if (set.profession === null) {
    return { profile: null, isLoaded: true };
  }

  return {
    profile: fighterProfile({
      profession: set.profession,
      level: set.level ?? SKILL_LEVEL_CAP,
      items: [...wornItems.values()],
      tree: tree ?? [],
      ranks: set.skills,
      weapons: wornSkillWeapons(wornItems),
    }),
    isLoaded: isLoaded && !isPending,
  };
};
