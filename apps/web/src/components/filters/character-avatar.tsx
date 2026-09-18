import { PlayerSpriteTile } from "@/components/tiles/player-sprite-tile";
import { cn } from "cn";

type CharacterAvatarProps = {
  icon?: string | null;
  className?: string;
};

// Crops the 32x48 sprite frame to the character's head and shoulders.
export const CharacterAvatar = ({ icon, className }: CharacterAvatarProps) => (
  <span
    className={cn(
      "relative size-7 shrink-0 overflow-hidden rounded-md bg-muted",
      className,
    )}
  >
    <PlayerSpriteTile
      icon={icon}
      wrapperClassName="absolute -left-0.5 top-0"
      tileClassName="cursor-[inherit] rounded-none hover:bg-transparent"
    />
  </span>
);
