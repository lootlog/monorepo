import { skillEffectLines } from "@/lib/skills/skill-effects";
import type { SkillDefinition } from "@/lib/skills/skill-tree";

/** What a skill does at one rank, line by line as the game's window says it. */
export function SkillEffectList({
  skill,
  rank,
  level,
  title,
}: {
  skill: SkillDefinition;
  rank: number;
  level: number | null;
  title: string;
}) {
  const lines = skillEffectLines(skill.ranks[rank - 1] ?? "", level);

  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      <ul className="flex flex-col gap-0.5 text-[0.8125rem] text-foreground">
        {lines.map((line, index) => (
          // Lines of one rank keep their order; two may read the same.
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
