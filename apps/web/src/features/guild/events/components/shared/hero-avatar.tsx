import { NpcTile } from "@/components/tiles/npc-tile";
import { cn } from "cn";
import { Swords } from "lucide-react";
import {
  NPC_TYPE_SURFACE_CLASS,
  NPC_TYPE_TEXT_CLASS,
  npcTypeColorStyle,
} from "@lootlog/ui/lib/npc-type-colors";

type HeroAvatarProps = {
  hero: {
    npcId?: number | null;
    npcName: string;
    npcIcon?: string | null;
  };
  size?: "default" | "portrait";
};

export const HeroAvatar = ({ hero, size = "default" }: HeroAvatarProps) => (
  <div
    className={cn(
      "flex shrink-0 items-center justify-center",
      size === "default" && "size-10 rounded-lg",
      size === "portrait" && "rounded-xl",
      size === "portrait" && (hero.npcIcon ? "h-16" : "size-16"),
      !hero.npcIcon &&
        cn(NPC_TYPE_SURFACE_CLASS, "ring-1 ring-inset ring-border/70"),
    )}
    style={hero.npcIcon ? undefined : npcTypeColorStyle("HERO")}
  >
    {hero.npcIcon ? (
      <NpcTile
        imageClassName={cn(
          size === "portrait" &&
            "max-h-14 max-w-14 rounded-none drop-shadow-[0_4px_6px_rgb(0_0_0/0.45)]",
        )}
        npc={{
          name: hero.npcName,
          icon: hero.npcIcon,
        }}
      />
    ) : (
      <Swords
        className={cn(
          NPC_TYPE_TEXT_CLASS,
          size === "portrait" ? "size-6" : "size-4",
        )}
        aria-hidden="true"
      />
    )}
  </div>
);
