import { cn } from "cn";
import type { FC } from "react";

import { itemIconUrl } from "@lootlog/domain/margonem-cdn";
import type { DisplayItemRarity } from "@lootlog/domain/item-rarity";
import { ITEM_RARITY_FRAME_CLASS } from "@lootlog/ui/lib/item-rarity-colors";

type ItemImageProps = {
  className?: string;
  color?: string;
  icon: string;
  rarity: DisplayItemRarity;
  shareIndex?: number;
  upgradeLevel?: number;
};

export const ItemImage: FC<ItemImageProps> = ({
  className,
  color,
  icon,
  rarity,
  shareIndex,
  upgradeLevel = 0,
}) => {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative box-content h-8 w-8 cursor-pointer rounded-md border-2 bg-cover bg-center",
          ITEM_RARITY_FRAME_CLASS[rarity],
        )}
        style={{
          backgroundImage: `url(${itemIconUrl(icon)})`,
        }}
      />
      {upgradeLevel > 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0.5 text-2xs leading-none font-bold text-green-400 tabular-nums [text-shadow:0_0_2px_#000,0_0_1px_#000]"
        >
          +{upgradeLevel}
        </span>
      ) : null}
      {shareIndex !== undefined && (
        <div
          className="absolute -right-1 top-7 flex size-4 items-center justify-center rounded-sm text-xs font-medium shadow-sm"
          style={{
            backgroundColor: color ?? "var(--background)",
          }}
        >
          {shareIndex + 1}
        </div>
      )}
    </div>
  );
};
