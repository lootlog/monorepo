import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { cn } from "@/lib/utils";
import { GameNpc } from "@/types/margonem/npcs";
import { FC } from "react";

export type NpcTileProps = {
  npc: GameNpc;
  className?: string;
  containerClassName?: string;
};

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
        "ll-w-12 ll-flex ll-items-center ll-justify-center",
        containerClassName
      )}
    >
      <img
        className={cn(
          "ll-custom-cursor-pointer ll-rounded-lg ll-max-w-12",
          className
        )}
        draggable={false}
        src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${npc.icon}`}
        alt={npc.nick}
      />
    </span>
  );
};
