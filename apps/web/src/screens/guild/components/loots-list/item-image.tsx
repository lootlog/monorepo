import { MARGONEM_CDN_ITEMS_URL } from "constants/margonem";
import { ItemRarity } from "hooks/api/use-loots";
import { FC } from "react";
import { cn } from "utils/cn";

type ItemImageProps = { rarity: ItemRarity; icon: string };

export const ItemImage: FC<ItemImageProps> = ({ rarity, icon }) => {
  return (
    <div
      className={cn(
        "w-[32px] h-[32px] relative cursor-pointer border-2 box-content",
        {
          "shadow-[inset_0_0_6px_0.5px_rgba(255,138,0,1)] border-amber-700 bg-amber-700/30":
            rarity === ItemRarity.LEGENDARY,
          "shadow-[inset_0_0_8px_0.5px_rgba(59,130,246,1)] border-blue-500 bg-blue-500/30":
            rarity === ItemRarity.HEROIC,
          "shadow-[inset_0_0_6px_0.5px_rgb(252,211,77,1)] border-amber-300 bg-amber-300/30":
            rarity === ItemRarity.UNIQUE,
        }
      )}
      style={{
        backgroundImage: `url(${MARGONEM_CDN_ITEMS_URL}/${icon})`,
      }}
    />
  );
};
