import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "components/ui/tooltip";
import { Item, ItemRarity } from "hooks/api/use-loots";
import { FC } from "react";
import { ItemImage } from "screens/guild/components/loots-list/item-image";
import { cn } from "utils/cn";

type ItemTileProps = {
  item: Item;
};

export const ItemTile: FC<ItemTileProps> = ({
  item: { name, rarity, icon },
}) => {
  const rarityCn = cn("text-sm", {
    "text-gray-500": rarity === ItemRarity.COMMON,
    "text-sm": rarity === ItemRarity.UPGRADED,
    "text-amber-700": rarity === ItemRarity.LEGENDARY,
    "text-blue-500": rarity === ItemRarity.HEROIC,
    "text-amber-300": rarity === ItemRarity.UNIQUE,
  });

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger>
          <ItemImage rarity={rarity} icon={icon} />
        </TooltipTrigger>
        <TooltipContent className="max-w-72 p-4">
          <div className="flex flex-row border-b items-center justify-between pb-2">
            <div className="flex flex-col justify-between p-2">
              <p className="font-heading mt-12 scroll-m-20 mr-8 text-md font-semibold tracking-tight first:mt-0">
                {name}
              </p>
              <p className={rarityCn}>
                {/* {t(`itemRarity.${rarity?.value}`)} */}
                {rarity}
              </p>
            </div>
            <ItemImage rarity={rarity} icon={icon} />
          </div>
          <div className="pt-2 px-2">
            <div>here stats xD</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
