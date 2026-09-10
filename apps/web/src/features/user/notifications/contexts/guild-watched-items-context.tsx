import { createContext } from "react";
import type {
  CreateWatchedItemQuickAddDto,
  WatchedItemResponseDto,
} from "@lootlog/client/main";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";

export type GuildWatchedItemsContextValue = {
  state: "loading" | "error" | "ready";
  hasActiveDm: boolean;
  isQuickAddPending: boolean;
  watchedItemsCount: number;
  quickAddWatchedItem: (
    data: CreateWatchedItemQuickAddDto,
  ) => Promise<WatchedItemResponseDto>;
  hasWatchedItem: (itemId: number, world: string) => boolean;
  isItemWatchedInScope: (itemId: number, scope: WatchedItemScope) => boolean;
  getWatchedItemId: (itemId: number, scope: WatchedItemScope) => number | null;
};

export const GuildWatchedItemsContext =
  createContext<GuildWatchedItemsContextValue | null>(null);

GuildWatchedItemsContext.displayName = "GuildWatchedItemsContext";
