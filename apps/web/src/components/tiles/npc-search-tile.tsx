import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";

type NpcSearchTileProps = {
  icon: string;
  name?: string;
  className?: string;
};

const isFullUrl = (url: string): boolean =>
  url.startsWith("http://") || url.startsWith("https://");

export const NpcSearchTile: FC<NpcSearchTileProps> = ({
  icon,
  name,
  className,
}) => {
  const src = isFullUrl(icon) ? icon : `${MARGONEM_CDN_NPCS_URL}${icon}`;

  return (
    <div className="flex h-10 w-8 items-center justify-center">
      <img
        className={cn(
          "relative cursor-pointer rounded-lg max-h-10 max-w-8",
          className,
        )}
        src={src}
        alt={name}
      />
    </div>
  );
};
