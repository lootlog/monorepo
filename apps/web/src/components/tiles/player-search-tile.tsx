import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";

type PlayerSearchTileProps = {
  icon: string;
  className?: string;
};

export const PlayerSearchTile: FC<PlayerSearchTileProps> = ({
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        "w-[32px] h-[48px] relative cursor-pointer rounded-lg bg-muted/30 transition-all duration-200 hover:bg-muted/50 mr-2",
        className,
      )}
      style={{
        backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${icon})`,
        backgroundColor: "transparent",
      }}
    />
  );
};
