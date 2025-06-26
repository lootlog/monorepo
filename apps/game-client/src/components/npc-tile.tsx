import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { cn } from "@/lib/utils";
import { GameNpc } from "@/types/margonem/npcs";
import { FC } from "react";

export type NpcTileProps = {
  npc: GameNpc;
  className?: string;
};

export const NpcTile: FC<NpcTileProps> = ({ npc, className }) => {
  const imageHasDomain =
    npc.icon.startsWith("http://") || npc.icon.startsWith("https://");

  return (
    <img
      className={cn(
        "ll-relative ll-custom-cursor-pointer ll-rounded-lg ll-max-h-16 ll-max-w-12",
        className
      )}
      draggable={false}
      src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${npc.icon}`}
      alt={npc.nick}
    />
  );
};
