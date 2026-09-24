import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  useGuildsControllerGetGuildById,
  invalidateUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";
import { refreshCurrentUserGuilds } from "@/lib/current-user-guilds";
import { useGuildId } from "@/hooks/context/use-guild-id";

export const Init: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const guildId = useGuildId();

  const { data: guildData } = useGuildsControllerGetGuildById(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: getGuildsControllerGetGuildByIdQueryKey({
          guildId: guildId ?? "",
        }),
        retry: true,
      },
    },
  );

  useEffect(() => {
    if (!guildData) {
      return;
    }

    // The API caches the Discord guild list, which may predate the new server.
    void Promise.allSettled([
      invalidateUsersControllerGetCurrentUserAccessibleGuilds(queryClient),
      refreshCurrentUserGuilds(queryClient),
    ]).then(() => {
      navigate({ to: ROUTES.guild.base(guildData.id) });
    });
  }, [guildData, navigate, queryClient]);

  return (
    <div className="h-full flex flex-col">
      <FullScreenLoading />
    </div>
  );
};
