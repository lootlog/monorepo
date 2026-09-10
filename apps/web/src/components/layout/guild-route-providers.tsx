import { GuildContextProvider } from "@/contexts/guild-provider";
import { GuildWatchedItemsProvider } from "@/features/user/notifications/contexts/guild-watched-items-provider";
import { Outlet } from "@tanstack/react-router";

export const GuildRouteProviders = () => {
  return (
    <GuildContextProvider>
      <GuildWatchedItemsProvider>
        <Outlet />
      </GuildWatchedItemsProvider>
    </GuildContextProvider>
  );
};
