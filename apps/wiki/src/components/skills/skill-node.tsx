import { ListPlus, Minus, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import { t } from "@/i18n/messages";
import type { SkillDefinition, SkillState } from "@/lib/skills/skill-tree";
import { SkillIcon } from "./skill-icon";

type SkillNodeProps = {
  skill: SkillDefinition;
  state: SkillState;
  range: { min: number; max: number };
  isSelected: boolean;
  isDimmed: boolean;
  canQueue: boolean;
  onSelect: () => void;
  onRankChange: (rank: number) => void;
  onQueue: () => void;
};

export function SkillNode({
  skill,
  state,
  range,
  isSelected,
  isDimmed,
  canQueue,
  onSelect,
  onRankChange,
  onQueue,
}: SkillNodeProps) {
  const { rank } = state;
  const isCounted = rank > 0 && !state.inactive;

  return (
    <li
      className={cn(
        "group/skill relative min-w-0 rounded-lg border bg-card transition-[opacity,border-color] duration-150 motion-reduce:transition-none",
        isSelected
          ? "border-primary bg-primary/10"
          : isCounted
            ? "border-primary/40 bg-primary/5"
            : "border-border/60 hover:border-border",
        isDimmed && "opacity-30",
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className="flex size-full min-w-0 cursor-pointer items-center gap-2 rounded-lg p-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SkillIcon skill={skill} isMuted={!isCounted} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-xs leading-tight font-medium text-foreground">
            {skill.name}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full",
                  state.inactive
                    ? "bg-destructive"
                    : skill.active
                      ? "bg-signal-timer"
                      : "bg-signal-live",
                )}
                style={{ width: `${(rank / skill.maxRank) * 100}%` }}
              />
            </span>
            <span
              className={cn(
                "text-[0.6875rem] tabular-nums",
                rank > 0 && state.inactive
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {t("skills.rank", { rank, max: skill.maxRank })}
            </span>
            <span className="sr-only">
              {skill.active ? t("skills.active") : t("skills.passive")}
            </span>
          </span>
        </span>
      </button>
      <div className="absolute -top-2.5 right-1 z-10 hidden gap-0.5 rounded-md border border-border bg-popover p-0.5 shadow-md group-focus-within/skill:flex group-hover/skill:flex">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={t("skills.lower", { skill: skill.name })}
          disabled={range.min >= rank}
          onClick={(event) =>
            onRankChange(event.shiftKey ? range.min : rank - 1)
          }
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={t("skills.raise", { skill: skill.name })}
          disabled={range.max <= rank}
          onClick={(event) =>
            onRankChange(event.shiftKey ? range.max : rank + 1)
          }
        >
          <Plus aria-hidden="true" />
        </Button>
        {skill.active ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={t("skills.mastery.add", { action: skill.name })}
            title={t("skills.mastery.add", { action: skill.name })}
            disabled={!canQueue || rank === 0}
            onClick={onQueue}
          >
            <ListPlus aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
