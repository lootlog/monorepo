import { GuildWatchedItemsProvider } from "@/features/user/notifications/contexts/guild-watched-items-provider";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildWorldFromUrl } from "@/hooks/context/use-guild-world";
import { Outlet } from "@tanstack/react-router";
import { Fragment } from "react";
import { GuildSearch } from "./guild-search";

export const GuildRouteProviders = () => {
  const guildId = useGuildId();

  useGuildWorldFromUrl();

  return (
    <GuildWatchedItemsProvider>
      <GuildSearch />
      {/* Another Organization's pages start fresh instead of keeping state. */}
      <Fragment key={guildId}>
        <Outlet />
      </Fragment>
    </GuildWatchedItemsProvider>
  );
};
