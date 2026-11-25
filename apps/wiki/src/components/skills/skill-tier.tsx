import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import type { SkillDefinition } from "@/lib/skills/skill-tree";

type SkillTierProps = {
  tierLevel: number;
  requiredPoints: number;
  isLocked: boolean;
  skills: readonly SkillDefinition[];
  selectedId: number | undefined;
  renderSkill: (skill: SkillDefinition) => ReactNode;
  panel: ReactNode;
};

export function SkillTier({
  tierLevel,
  requiredPoints,
  isLocked,
  skills,
  selectedId,
  renderSkill,
  panel,
}: SkillTierProps) {
  const headingId = `skill-tier-${tierLevel}`;

  return (
    <section
      aria-labelledby={headingId}
      className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-2 p-2"
    >
      <div
        className={cn(
          "flex flex-col items-center leading-tight",
          isLocked ? "text-muted-foreground" : "text-foreground",
        )}
      >
        <h3
          id={headingId}
          aria-label={t("skills.tier", { level: tierLevel })}
          className="flex items-center gap-1 text-sm font-semibold tabular-nums"
        >
          {isLocked ? (
            <Lock aria-label={t("skills.tierLocked")} className="size-3" />
          ) : null}
          {tierLevel}
        </h3>
        <p className="text-[0.6875rem] text-muted-foreground tabular-nums">
          {t("skills.tierRequirement", { points: requiredPoints })}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 @xl/tree:grid-cols-3 @5xl/tree:grid-cols-6">
        {skills.map(renderSkill)}
      </ul>
      {skills.some((skill) => skill.id === selectedId) ? (
        <div className="col-span-full rounded-lg border border-border bg-card p-4 @5xl/skills:hidden">
          {panel}
        </div>
      ) : null}
    </section>
  );
}
