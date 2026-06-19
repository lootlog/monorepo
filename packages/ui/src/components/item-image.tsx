import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";

export const ItemRarity = {
  COMMON: "COMMON",
  HEROIC: "HEROIC",
  LEGENDARY: "LEGENDARY",
  UNIQUE: "UNIQUE",
  UPGRADED: "UPGRADED",
} as const;

export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];

const MARGONEM_CDN_ITEMS_URL = "https://micc.garmory-cdn.cloud/obrazki/itemy";

type ItemImageProps = {
  className?: string;
  color?: string;
  icon: string;
  rarity: ItemRarity;
  shareIndex?: number;
};

export const ItemImage: FC<ItemImageProps> = ({
  className,
  color,
  icon,
  rarity,
  shareIndex,
}) => {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative box-content h-8 w-8 cursor-pointer rounded-md border-2 bg-cover bg-center",
          {
            "border-orange-600 bg-card/80 shadow-[0_0_12px_rgba(234,88,12,0.5)]":
              rarity === ItemRarity.LEGENDARY,
            "border-blue-500 bg-card/80 shadow-[0_0_10px_rgba(59,130,246,0.4)]":
              rarity === ItemRarity.HEROIC,
            "border-amber-300 bg-card/80 shadow-[0_0_10px_rgba(252,211,77,0.4)]":
              rarity === ItemRarity.UNIQUE,
            "border-border/50 bg-muted/30": rarity === ItemRarity.COMMON,
            "border-primary/40 bg-muted/50": rarity === ItemRarity.UPGRADED,
          },
        )}
        style={{
          backgroundImage: `url(${MARGONEM_CDN_ITEMS_URL}/${icon})`,
        }}
      />
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
