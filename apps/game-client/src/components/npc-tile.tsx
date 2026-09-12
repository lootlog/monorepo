import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { cn } from "cn";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { FC } from "react";

type NpcTileProps = {
  npc: Pick<GameNpc, "icon" | "nick">;
  className?: string;
  containerClassName?: string;
};

/** NPC sprite scaled into a 28×40 list slot. */
export const NpcTile: FC<NpcTileProps> = ({
  npc,
  className,
  containerClassName,
}) => {
  const imageHasDomain =
    npc.icon.startsWith("http://") || npc.icon.startsWith("https://");

  return (
    <span
      className={cn(
        "ll:flex ll:h-10 ll:w-7 ll:shrink-0 ll:items-center ll:justify-center",
        containerClassName,
      )}
    >
      <img
        className={cn(
          "ll-custom-cursor-pointer ll:max-h-10 ll:w-auto ll:max-w-7 ll:rounded-lg ll:object-contain",
          className,
        )}
        draggable={false}
        src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${npc.icon}`}
        alt={npc.nick}
      />
    </span>
  );
};
