import { GuildContextProvider } from "@/contexts/guild.context";
import { GuildWatchedItemsProvider } from "@/features/user-notifications/contexts/guild-watched-items-context";
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
