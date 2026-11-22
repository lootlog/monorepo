import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import {
  type SkillDefinition,
  skillPlanLevel,
  type SkillRanks,
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
  selectedId: number | undefined;
  onSelect: (skillId: number) => void;
  panel: ReactNode;
};

export function SkillTier({
  tree,
  tierLevel,
  ranks,
  level,
  weapons,
  selectedId,
  onSelect,
  panel,
}: SkillTierProps) {
  const skills = tree.filter((skill) => skill.level === tierLevel);
  const requiredPoints = tierPointsRequired(tierLevel);

  const isLocked =
    skillPlanLevel(level) < tierLevel ||
    spentSkillPoints(tree, ranks) < requiredPoints;

  const headingId = `skill-tier-${tierLevel}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
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
      <ul className="grid grid-cols-1 gap-2 @md:grid-cols-2 @2xl:grid-cols-3">
        {skills.map((skill) => (
          <SkillNode
            key={skill.id}
            skill={skill}
            state={skillState(skill, ranks, level, weapons)}
            isSelected={skill.id === selectedId}
            onSelect={() => onSelect(skill.id)}
          />
        ))}
      </ul>
      {skills.some((skill) => skill.id === selectedId) ? (
        <div className="rounded-lg border border-border bg-card p-4 @4xl/skills:hidden">
          {panel}
        </div>
      ) : null}
    </section>
  );
}
