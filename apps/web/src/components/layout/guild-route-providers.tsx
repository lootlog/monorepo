import { GuildContextProvider } from "@/contexts/guild-provider";
import { GuildWatchedItemsProvider } from "@/features/user/notifications/contexts/guild-watched-items-provider";
import { Outlet } from "@tanstack/react-router";
import { GuildSearch } from "./guild-search";

export const GuildRouteProviders = () => {
  return (
    <GuildContextProvider>
      <GuildWatchedItemsProvider>
        <GuildSearch>
          <Outlet />
        </GuildSearch>
      </GuildWatchedItemsProvider>
    </GuildContextProvider>
  );
};
