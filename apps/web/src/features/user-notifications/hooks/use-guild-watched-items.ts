import { GuildWatchedItemsContext } from "@/features/user-notifications/contexts/guild-watched-items-context";
import { useContext } from "react";

export const useGuildWatchedItems = () => {
  const context = useContext(GuildWatchedItemsContext);

  if (!context) {
    throw new Error(
      "useGuildWatchedItems must be used within a GuildWatchedItemsProvider",
    );
  }

  return context;
};
