import { Sword } from "lucide-react";
import { cn } from "cn";
import type { SkillDefinition } from "@/lib/skills/skill-tree";
import { SkillIcon } from "./skill-icon";

type MasteryActionLabelProps = {
  name: string;
  skill: SkillDefinition | undefined;
  note?: string;
  isMuted: boolean;
};

export function MasteryActionLabel({
  name,
  skill,
  note,
  isMuted,
}: MasteryActionLabelProps) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      {skill ? (
        <SkillIcon skill={skill} isMuted={isMuted} />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border/60",
            isMuted && "opacity-60",
          )}
        >
          <Sword className="size-4" />
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[0.8125rem] leading-tight font-medium text-pretty text-foreground">
          {name}
        </span>
        {note ? <span className="text-xs text-destructive">{note}</span> : null}
      </span>
    </span>
  );
}
