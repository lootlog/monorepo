import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { cn } from "cn";
import type { FC } from "react";

type NpcSearchTileProps = {
  icon: string;
  name?: string;
  className?: string;
};

export const NpcSearchTile: FC<NpcSearchTileProps> = ({
  icon,
  name,
  className,
}) => {
  const src = npcIconUrl(icon);

  return (
    <div className="flex h-10 w-8 shrink-0 items-center justify-center">
      {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
      <img
        className={cn(
          "relative cursor-pointer rounded-lg max-h-10 max-w-8",
          className,
        )}
        src={src}
        alt={name ?? ""}
      />
    </div>
  );
};
