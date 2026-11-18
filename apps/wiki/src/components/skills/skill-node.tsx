import { cn } from "cn";
import { t } from "@/i18n/messages";
import type { SkillDefinition, SkillState } from "@/lib/skills/skill-tree";
import { SkillIcon } from "./skill-icon";

type SkillNodeProps = {
  skill: SkillDefinition;
  state: SkillState;
  isSelected: boolean;
  onSelect: () => void;
};

/**
 * One skill of the tree: its icon, name and rank. Choosing it opens what it
 * does and the controls that hand out its points.
 */
export function SkillNode({
  skill,
  state,
  isSelected,
  onSelect,
}: SkillNodeProps) {
  const { rank } = state;
  const isCounted = rank > 0 && !state.inactive;

  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={cn(
          "flex size-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border bg-card p-2 text-left outline-none transition-colors duration-150 hover:border-border focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
          isSelected
            ? "border-primary bg-primary/10"
            : isCounted
              ? "border-primary/40 bg-primary/5"
              : "border-border/60",
        )}
      >
        <SkillIcon skill={skill} isMuted={!isCounted} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[0.8125rem] leading-tight font-medium text-pretty text-foreground">
            {skill.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {skill.active ? t("skills.active") : t("skills.passive")}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            rank === 0
              ? "text-muted-foreground"
              : state.inactive
                ? "text-destructive"
                : "text-foreground",
          )}
        >
          {t("skills.rank", { rank, max: skill.maxRank })}
        </span>
      </button>
    </li>
  );
}
