import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { IdenticalItems } from "./group-identical-items";
import { LootItemIdButton } from "./loot-item-id-button";

/** An item with its name, level and copy count, and its identifiers. */
export const LootItemLine = ({
  entry: { item, hids },
  watchContext,
  showIdButton = true,
  className,
}: {
  entry: IdenticalItems;
  watchContext: WatchedItemScope;
  showIdButton?: boolean;
  className?: string;
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <WatchableItemTile item={item} watchContext={watchContext} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 min-w-0 break-words text-sm font-medium leading-tight">
          {item.name}
          {hids.length > 1 && (
            <span className="ml-1.5 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
              ×{hids.length}
            </span>
          )}
        </p>
        {item.lvl > 0 && (
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {t("common.levelShort", { level: item.lvl })}
          </p>
        )}
      </div>
      {showIdButton && (
        <LootItemIdButton hids={hids} world={watchContext.world} />
      )}
    </div>
  );
};
