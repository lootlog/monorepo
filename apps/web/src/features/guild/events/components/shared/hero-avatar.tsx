import { NpcTile } from "@/components/tiles";
import { cn } from "cn";
import { Swords } from "lucide-react";

type HeroAvatarProps = {
  hero: {
    npcId?: number | null;
    npcName: string;
    npcIcon?: string | null;
  };
  /** `portrait` shows the sprite at up to 56px for a page header. */
  size?: "default" | "portrait";
};

/** A hero's NPC sprite, or a swords tile while the game has not reported one. */
export const HeroAvatar = ({ hero, size = "default" }: HeroAvatarProps) => (
  <div
    className={cn(
      "flex shrink-0 items-center justify-center rounded-xl",
      size === "default" && "size-10",
      size === "portrait" && (hero.npcIcon ? "h-16" : "size-16"),
      !hero.npcIcon && "bg-yellow-500/10 ring-1 ring-inset ring-border/70",
    )}
  >
    {hero.npcIcon ? (
      <NpcTile
        imageClassName={cn(
          size === "portrait" &&
            "max-h-14 max-w-14 rounded-none drop-shadow-[0_4px_6px_rgb(0_0_0/0.45)]",
        )}
        npc={{
          id: hero.npcId ?? undefined,
          name: hero.npcName,
          icon: hero.npcIcon,
        }}
      />
    ) : (
      <Swords
        className={cn(
          "text-yellow-500",
          size === "portrait" ? "size-6" : "size-4",
        )}
        aria-hidden="true"
      />
    )}
  </div>
);
