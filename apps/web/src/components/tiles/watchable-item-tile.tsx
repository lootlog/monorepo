import { useWatchableItemActions } from "./use-watchable-item-actions";
import { type ItemTileProps, ItemTile } from "@/components/tiles/item-tile";
import type { Item } from "@/lib/loots/loot-types";
import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user/notifications/constants/user-watched-items-limit";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";

import { Bell, BellOff, Check, Copy, ListFilter, Plus } from "lucide-react";

import { Button } from "@lootlog/ui/components/button";
import { Spinner } from "@lootlog/ui/components/spinner";
import { cn } from "cn";

type WatchableItemTileProps = Omit<ItemTileProps, "item"> & {
  item: Item;
  watchContext: WatchedItemScope;
  selectedItemNames?: string[];
};

export const WatchableItemTile = ({
  item,
  color,
  shareIndex,
  shareNickname,
  watchContext,
  selectedItemNames = [],
}: WatchableItemTileProps) => {
  const {
    t,
    isCopyPending,
    isAddingThisItem,
    state,
    isQuickAddPending,
    isRemovePending,
    effectiveGuildId,
    isWatchedItemLimitReached,
    isWatchedInScope,
    showAddAction,
    showDmRequired,
    showPending,
    showRemoveAction,
    handleCopyItemId,
    showLootsWithItem,
    handleRemove,
    handleQuickAdd,
    openNotifications,
  } = useWatchableItemActions(item, watchContext);
  const hasItemFilter = selectedItemNames.length > 0;
  const isItemSelected = selectedItemNames.includes(item.name);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "relative inline-flex rounded-lg transition-[opacity,filter] duration-200",
              hasItemFilter && !isItemSelected && "opacity-35 grayscale-[0.45]",
            )}
          >
            <ItemTile
              item={item}
              color={color}
              shareIndex={shareIndex}
              shareNickname={shareNickname}
            />
            {hasItemFilter && isItemSelected ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background"
              >
                <Check className="size-2.5" />
              </span>
            ) : null}
            {isWatchedInScope ? (
              <span
                aria-hidden="true"
                title={t("settings.userNotifications.quickAdd.indicatorLabel")}
                className="pointer-events-none absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-background shadow-sm ring-2 ring-background"
              >
                <Bell className="size-2.5" />
              </span>
            ) : null}
          </button>
        }
      />
      <ContextMenuContent className="min-w-[15rem]">
        <ContextMenuItem
          className="w-full justify-start gap-2"
          closeOnClick={false}
          disabled={isCopyPending}
          render=<Button
            variant="ghost"
            loading={isCopyPending}
            icon={<Copy className="h-4 w-4 text-muted-foreground" />}
          />
          onClick={() => {
            void handleCopyItemId();
          }}
        >
          {t("loots.list.itemActions.copyId")}
        </ContextMenuItem>
        <ContextMenuItem
          className="gap-2"
          disabled={!effectiveGuildId}
          onClick={showLootsWithItem}
        >
          <ListFilter className="h-4 w-4 text-primary" />
          {t("loots.list.itemActions.showLoots")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {showPending ? (
          <ContextMenuItem disabled className="gap-2">
            <Spinner
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground motion-reduce:animate-none"
            />
            {t("settings.userNotifications.quickAdd.loading")}
          </ContextMenuItem>
        ) : null}
        {state === "error" ? (
          <>
            <ContextMenuItem disabled>
              {t("settings.userNotifications.quickAdd.loadError")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={openNotifications}>
              {t("settings.userNotifications.quickAdd.openNotifications")}
            </ContextMenuItem>
          </>
        ) : null}
        {showDmRequired ? (
          <>
            <ContextMenuItem disabled>
              {t("settings.userNotifications.quickAdd.dmRequired")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={openNotifications}>
              {t("settings.userNotifications.quickAdd.configureDm")}
            </ContextMenuItem>
          </>
        ) : null}
        {showRemoveAction ? (
          <>
            <ContextMenuItem
              className="w-full justify-start gap-2"
              closeOnClick={false}
              disabled={isRemovePending}
              render=<Button
                variant="ghost"
                loading={isRemovePending}
                icon={<BellOff className="h-4 w-4 text-muted-foreground" />}
              />
              onClick={() => {
                void handleRemove();
              }}
            >
              {t("settings.userNotifications.quickAdd.remove")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={openNotifications}>
              {t("settings.userNotifications.quickAdd.openNotifications")}
            </ContextMenuItem>
          </>
        ) : null}
        {showAddAction ? (
          isWatchedItemLimitReached ? (
            <>
              <ContextMenuItem disabled>
                {t("settings.userNotifications.quickAdd.limitReached", {
                  limit: USER_WATCHED_ITEMS_LIMIT,
                })}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={openNotifications}>
                {t("settings.userNotifications.quickAdd.openNotifications")}
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem
              className="w-full justify-start gap-2"
              closeOnClick={false}
              disabled={isQuickAddPending || isAddingThisItem}
              render=<Button
                variant="ghost"
                loading={isAddingThisItem}
                icon={<Plus className="h-4 w-4 text-muted-foreground" />}
              />
              onClick={() => {
                void handleQuickAdd();
              }}
            >
              {t("settings.userNotifications.quickAdd.add")}
            </ContextMenuItem>
          )
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
};
