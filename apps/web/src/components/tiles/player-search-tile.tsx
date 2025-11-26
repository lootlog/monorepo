import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import type { FC } from "react";

type PlayerSearchTileProps = {
  icon: string;
  name: string;
};

export const PlayerSearchTile: FC<PlayerSearchTileProps> = ({ icon, name }) => {
  return (
    <img
      src={`${MARGONEM_CDN_CHARACTERS_URL}${icon}`}
      alt={name}
      className="h-6 w-6 mr-2"
    />
  );
};
