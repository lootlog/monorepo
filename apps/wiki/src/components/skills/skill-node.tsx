import { Minus, Plus, Zap } from "lucide-react";
import type { MouseEvent } from "react";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { t } from "@/i18n/messages";
import type { SkillDefinition, SkillState } from "@/lib/skills/skill-tree";
import { SkillDetails } from "./skill-details";
import { SkillIcon } from "./skill-icon";

type SkillNodeProps = {
  skill: SkillDefinition;
  state: SkillState;
  /** The ranks the skill can move between from where the tree stands. */
  range: { min: number; max: number };
  level: number | null;
  onRankChange: (rank: number) => void;
};

/**
 * One skill of the tree: its icon, name and rank, with buttons that add or
 * take away a point, or with Shift every point the tree allows. The name
 * opens what the skill does.
 */
export function SkillNode({
  skill,
  state,
  range,
  level,
  onRankChange,
}: SkillNodeProps) {
  const { rank } = state;

  const step = (direction: 1 | -1) => (event: MouseEvent) => {
    const target = direction > 0 ? range.max : range.min;

    onRankChange(event.shiftKey ? target : rank + direction);
  };

  return (
    <li
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border bg-card p-2 transition-colors duration-200 motion-reduce:transition-none",
        rank > 0 && !state.inactive
          ? "border-primary/40 bg-primary/5"
          : "border-border/60",
      )}
    >
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={t("skills.details", { skill: skill.name })}
            />
          }
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SkillIcon skill={skill} isMuted={rank === 0 || !!state.inactive} />
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.8125rem] leading-tight font-medium text-pretty text-foreground">
              {skill.name}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 text-xs tabular-nums",
                state.inactive && rank > 0
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {t("skills.rank", { rank, max: skill.maxRank })}
              {skill.active ? (
                <Zap
                  aria-label={t("skills.active")}
                  className="size-3 text-signal-ready"
                />
              ) : null}
            </span>
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <SkillDetails skill={skill} state={state} level={level} />
        </PopoverContent>
      </Popover>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("skills.lower", { skill: skill.name })}
          title={t("skills.raiseHint")}
          disabled={range.min >= rank}
          onClick={step(-1)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("skills.raise", { skill: skill.name })}
          title={t("skills.raiseHint")}
          disabled={range.max <= rank}
          onClick={step(1)}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
