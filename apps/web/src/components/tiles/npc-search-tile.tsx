import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import type { FC } from "react";

type NpcSearchTileProps = {
  icon: string;
  name?: string;
};

export const NpcSearchTile: FC<NpcSearchTileProps> = ({ icon, name }) => {
  return (
    <div className="w-8">
      {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
      <img
        className="relative cursor-pointer rounded-lg max-h-10 max-w-8"
        src={`${MARGONEM_CDN_NPCS_URL}${icon}`}
        alt={name}
      />
    </div>
  );
};
