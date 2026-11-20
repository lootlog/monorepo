import { GuildWatchedItemsContext } from "@/contexts/guild-watched-items-context";
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
