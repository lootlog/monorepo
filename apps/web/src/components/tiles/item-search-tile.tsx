import { MARGONEM_CDN_ITEMS_URL } from "@/constants/margonem";
import type { FC } from "react";

type ItemSearchTileProps = {
  icon: string;
  name: string;
};

export const ItemSearchTile: FC<ItemSearchTileProps> = ({ icon, name }) => {
  return (
    <img
      src={`${MARGONEM_CDN_ITEMS_URL}/${icon}`}
      alt={name}
      className="h-6 w-6 mr-2"
    />
  );
};
