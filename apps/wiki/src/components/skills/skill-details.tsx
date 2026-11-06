import { t } from "@/i18n/messages";
import type { SkillDefinition, SkillState } from "@/lib/skills/skill-tree";
import { SkillEffectList } from "./skill-effect-list";

const weaponNames = (weapons: SkillDefinition["weapons"]) =>
  weapons.map((weapon) => t(`skills.weapons.${weapon}`)).join(", ");

/**
 * A skill as the game's window explains it: what it is, what it needs, and
 * what it does at its rank and at the next one.
 */
export function SkillDetails({
  skill,
  state,
  level,
}: {
  skill: SkillDefinition;
  state: SkillState;
  level: number | null;
}) {
  const { rank } = state;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold text-foreground">{skill.name}</p>
        <p className="text-xs text-muted-foreground">
          {[
            skill.active ? t("skills.active") : t("skills.passive"),
            t("skills.requiresLevel", { level: skill.level }),
            skill.weapons.length > 0
              ? t("skills.requiresWeapons", {
                  weapons: weaponNames(skill.weapons),
                })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <p className="text-[0.8125rem] text-pretty text-muted-foreground">
        {skill.description}
      </p>
      {rank > 0 && state.inactive ? (
        <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {state.inactive === "level"
            ? t("skills.inactiveLevel")
            : t("skills.inactiveWeapons", {
                weapons: weaponNames(state.missingWeapons),
              })}
        </p>
      ) : null}
      <SkillEffectList
        skill={skill}
        rank={Math.max(rank, 1)}
        level={level}
        title={
          rank > 0 ? t("skills.currentRank", { rank }) : t("skills.firstRank")
        }
      />
      {rank > 0 && rank < skill.maxRank ? (
        <SkillEffectList
          skill={skill}
          rank={rank + 1}
          level={level}
          title={t("skills.nextRank", { rank: rank + 1 })}
        />
      ) : null}
    </div>
  );
}
