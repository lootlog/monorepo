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
          "shadow-[inset_0_0_6px_0.5px_rgba(255,138,0,1)]":
            rarity === ItemRarity.LEGENDARY,
          "border-amber-700": rarity === ItemRarity.LEGENDARY,
          "shadow-[inset_0_0_8px_0.5px_rgba(59,130,246,1)]":
            rarity === ItemRarity.HEROIC,
          "border-blue-500": rarity === ItemRarity.HEROIC,
          "shadow-[inset_0_0_6px_0.5px_rgb(252,211,77,1)]":
            rarity === ItemRarity.UNIQUE,
          "border-amber-300": rarity === ItemRarity.UNIQUE,
        }
      )}
      style={{
        backgroundImage: `url(${MARGONEM_CDN_ITEMS_URL}/${icon})`,
      }}
    />
  );
};
