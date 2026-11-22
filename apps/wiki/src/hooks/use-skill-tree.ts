import { useQuery } from "@tanstack/react-query";
import type { Profession } from "@/lib/equipment-set";
import { loadSkillTree } from "@/lib/skills/skill-tree";

export const useSkillTree = (profession: Profession | null) =>
  useQuery({
    queryKey: ["skill-tree", profession],
    queryFn: () => (profession ? loadSkillTree(profession) : []),
    enabled: profession !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
