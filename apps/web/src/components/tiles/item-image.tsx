import { MARGONEM_CDN_ITEMS_URL } from "@/constants/margonem";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import type { FC } from "react";
import { cn } from "@/utils/cn";

type ItemImageProps = {
  rarity: ItemRarity;
  icon: string;
  color?: string;
  shareIndex?: number;
};

export const ItemImage: FC<ItemImageProps> = ({
  rarity,
  icon,
  color,
  shareIndex,
}) => {
  return (
    <div className="relative">
      <div
        className={cn(
          "w-[32px] h-[32px] relative cursor-pointer border-2 box-content rounded-md transition-all duration-200",
          {
            "border-yellow-500/80 bg-card/80 shadow-[0_0_15px_rgba(234,179,8,0.3),inset_0_0_8px_rgba(234,179,8,0.4)]":
              rarity === ItemRarity.LEGENDARY,
            "border-blue-500/80 bg-card/80 shadow-[0_0_10px_rgba(59,130,246,0.25),inset_0_0_6px_rgba(59,130,246,0.3)]":
              rarity === ItemRarity.HEROIC,
            "border-amber-300/80 bg-card/80 shadow-[0_0_10px_rgba(252,211,77,0.25),inset_0_0_6px_rgba(252,211,77,0.3)]":
              rarity === ItemRarity.UNIQUE,
            "border-primary/40 bg-muted/50": rarity === ItemRarity.UPGRADED,
            "border-border/50 bg-muted/30": rarity === ItemRarity.COMMON,
          },
        )}
        style={{
          backgroundImage: `url(${MARGONEM_CDN_ITEMS_URL}/${icon})`,
        }}
      />
      {(shareIndex || shareIndex === 0) && (
        <div
          className={cn(
            "top-7 -right-1 absolute size-4 rounded-sm box-content text-xs flex items-center justify-center font-medium shadow-sm",
          )}
          style={{
            backgroundColor: color ? `${color}` : "var(--background)",
          }}
        >
          {shareIndex + 1}
        </div>
      )}
    </div>
  );
};
