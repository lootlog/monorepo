import { Lock } from "lucide-react";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import {
  type SkillDefinition,
  skillPlanLevel,
  type SkillRanks,
  skillRankRange,
  skillState,
  type SkillWeapon,
  spentSkillPoints,
  tierPointsRequired,
} from "@/lib/skills/skill-tree";
import { SkillNode } from "./skill-node";

type SkillTierProps = {
  tree: readonly SkillDefinition[];
  tierLevel: number;
  ranks: SkillRanks;
  level: number | null;
  weapons: ReadonlySet<SkillWeapon>;
  onRankChange: (skillId: number, rank: number) => void;
};

/**
 * One tier of the tree: the level and spent points it opens at, then its
 * skills in the game's order. A tier the character cannot learn yet says so.
 */
export function SkillTier({
  tree,
  tierLevel,
  ranks,
  level,
  weapons,
  onRankChange,
}: SkillTierProps) {
  const skills = tree.filter((skill) => skill.level === tierLevel);
  const requiredPoints = tierPointsRequired(tierLevel);

  const isLocked =
    skillPlanLevel(level) < tierLevel ||
    spentSkillPoints(tree, ranks) < requiredPoints;

  const headingId = `skill-tier-${tierLevel}`;

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-2 md:grid-cols-[8rem_minmax(0,1fr)] md:gap-4"
    >
      <div className="flex items-baseline gap-2 md:flex-col md:gap-0.5 md:pt-2">
        <h3
          id={headingId}
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold",
            isLocked ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {isLocked ? (
            <Lock aria-label={t("skills.tierLocked")} className="size-3.5" />
          ) : null}
          {t("skills.tier", { level: tierLevel })}
        </h3>
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("skills.tierRequirement", { points: requiredPoints })}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {skills.map((skill) => (
          <SkillNode
            key={skill.id}
            skill={skill}
            state={skillState(skill, ranks, level, weapons)}
            range={skillRankRange(tree, skill, ranks, level)}
            level={level}
            onRankChange={(rank) => onRankChange(skill.id, rank)}
          />
        ))}
      </ul>
    </section>
  );
}
