import { Minus, Plus } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Slider } from "@lootlog/ui/components/slider";
import { t } from "@/i18n/messages";
import type { SkillDefinition, SkillState } from "@/lib/skills/skill-tree";
import { SkillEffectList } from "./skill-effect-list";
import { SkillIcon } from "./skill-icon";

const weaponNames = (weapons: SkillDefinition["weapons"]) =>
  weapons.map((weapon) => t(`skills.weapons.${weapon}`)).join(", ");

type SkillPanelProps = {
  skill: SkillDefinition;
  state: SkillState;
  /** The ranks the skill can move between from where the tree stands. */
  range: { min: number; max: number };
  level: number | null;
  /**
   * A rank the slider points at beyond what the tree allows now, shown
   * without being learned.
   */
  preview: number | undefined;
  onPreviewChange: (rank: number | undefined) => void;
  onRankChange: (rank: number) => void;
};

/**
 * The chosen skill as the game's window explains it, with the controls that
 * hand out its points: one at a time, all at once, or with a slider that
 * also shows what any rank would do before it can be learned.
 */
export function SkillPanel({
  skill,
  state,
  range,
  level,
  preview,
  onPreviewChange,
  onRankChange,
}: SkillPanelProps) {
  const { rank } = state;
  const shownRank = preview ?? rank;

  const setRank = (next: number) => {
    onPreviewChange(undefined);
    onRankChange(next);
  };

  // The slider learns as far as the tree allows and previews the rest.
  const slideTo = (target: number) => {
    const learned = Math.min(Math.max(target, range.min), range.max);

    onPreviewChange(learned === target ? undefined : target);

    if (learned !== rank) onRankChange(learned);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <SkillIcon skill={skill} isMuted={false} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-semibold text-pretty text-foreground">
            {skill.name}
          </p>
          <p className="text-xs text-pretty text-muted-foreground">
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
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("skills.points")}
          </p>
          <p
            aria-live="polite"
            className="text-sm font-semibold text-foreground tabular-nums"
          >
            {t("skills.rank", { rank, max: skill.maxRank })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("skills.lower", { skill: skill.name })}
            disabled={range.min >= rank}
            onClick={() => setRank(rank - 1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Slider
            aria-label={t("skills.slider", { skill: skill.name })}
            min={0}
            max={skill.maxRank}
            step={1}
            value={[shownRank]}
            onValueChange={(value) => {
              const [target] = Array.isArray(value) ? value : [value];

              if (target !== undefined) slideTo(target);
            }}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("skills.raise", { skill: skill.name })}
            disabled={range.max <= rank}
            onClick={() => setRank(rank + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={range.max <= rank}
            onClick={() => setRank(range.max)}
          >
            {t("skills.max")}
          </Button>
        </div>
        {preview === undefined ? null : (
          <p className="text-xs text-pretty text-muted-foreground">
            {preview > rank
              ? t("skills.previewAbove", { rank: preview })
              : t("skills.previewBelow", { rank: preview })}
          </p>
        )}
      </div>
      <SkillEffectList
        skill={skill}
        rank={Math.max(shownRank, 1)}
        level={level}
        title={
          shownRank === 0
            ? t("skills.firstRank")
            : shownRank === rank
              ? t("skills.currentRank", { rank })
              : t("skills.previewRank", { rank: shownRank })
        }
      />
      {rank > 0 && shownRank !== rank ? (
        <SkillEffectList
          skill={skill}
          rank={rank}
          level={level}
          title={t("skills.learnedRank", { rank })}
        />
      ) : null}
    </div>
  );
}
