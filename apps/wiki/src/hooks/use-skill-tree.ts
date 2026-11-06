import { useQuery } from "@tanstack/react-query";
import type { Profession } from "@/lib/equipment-set";
import { loadSkillTree } from "@/lib/skills/skill-tree";

/** The profession's skill tree; none without a profession or while it loads. */
export const useSkillTree = (profession: Profession | null) =>
  useQuery({
    queryKey: ["skill-tree", profession],
    queryFn: () => (profession ? loadSkillTree(profession) : []),
    enabled: profession !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
