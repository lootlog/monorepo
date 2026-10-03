import { NpcTile } from "@/components/tiles";
import { cn } from "cn";
import { Swords } from "lucide-react";

type HeroAvatarProps = {
  hero: {
    npcId?: number | null;
    npcName: string;
    npcIcon?: string | null;
  };
};

/** A hero's NPC sprite, or a swords tile while the game has not reported one. */
export const HeroAvatar = ({ hero }: HeroAvatarProps) => (
  <div
    className={cn(
      "flex size-10 shrink-0 items-center justify-center rounded-xl",
      !hero.npcIcon && "bg-yellow-500/10 ring-1 ring-inset ring-border/70",
    )}
  >
    {hero.npcIcon ? (
      <NpcTile
        npc={{
          id: hero.npcId ?? undefined,
          name: hero.npcName,
          icon: hero.npcIcon,
        }}
      />
    ) : (
      <Swords className="size-4 text-yellow-500" aria-hidden="true" />
    )}
  </div>
);
