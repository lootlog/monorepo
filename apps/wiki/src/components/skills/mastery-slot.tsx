import { ArrowDown, ArrowUp, type LucideIcon, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import { t } from "@/i18n/messages";
import type { SkillDefinition } from "@/lib/skills/skill-tree";
import { MasteryActionLabel } from "./mastery-action-label";

type MasterySlotProps = {
  position: number;
  name: string;
  skill: SkillDefinition | undefined;
  icon: LucideIcon | undefined;
  note: string | undefined;
  isDragged: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  onRemove: () => void;
};

export function MasterySlot({
  position,
  name,
  skill,
  icon,
  note,
  isDragged,
  onDragStart,
  onDrop,
  onMoveUp,
  onMoveDown,
  onRemove,
}: MasterySlotProps) {
  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "flex min-h-11 cursor-grab items-center gap-2 border-b border-border/40 px-3 py-1 hover:bg-accent/35",
        isDragged && "opacity-40",
      )}
    >
      <span className="w-5 shrink-0 text-right text-xs font-semibold text-muted-foreground tabular-nums">
        {position}
      </span>
      <MasteryActionLabel
        name={name}
        skill={skill}
        icon={icon}
        note={note}
        isMuted={note !== undefined}
      />
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t("skills.mastery.moveUp", { action: name })}
          disabled={onMoveUp === null}
          onClick={onMoveUp ?? undefined}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t("skills.mastery.moveDown", { action: name })}
          disabled={onMoveDown === null}
          onClick={onMoveDown ?? undefined}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t("skills.mastery.remove", { action: name })}
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
