import type { CSSProperties } from "react";
import { cn } from "cn";
import type { SkillDefinition } from "@/lib/skills/skill-tree";

// The game's skill icons, 32 px cells on a 33 px grid.
const SKILL_ICON_SPRITE =
  "https://experimental.margonem.pl/img/gui/skills/skill_icons_new.png";

/** A skill's icon from the game's sprite, greyed while it has no rank. */
export function SkillIcon({
  skill,
  isMuted,
}: {
  skill: SkillDefinition;
  isMuted: boolean;
}) {
  const [x, y] = skill.icon;

  const style: CSSProperties = {
    backgroundImage: `url(${SKILL_ICON_SPRITE})`,
    backgroundPosition: `${x}px ${y}px`,
  };

  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn(
        "size-8 shrink-0 rounded-md bg-no-repeat ring-1 ring-border/60 transition-[filter,opacity] duration-200 motion-reduce:transition-none",
        isMuted && "opacity-60 grayscale",
      )}
    />
  );
}
