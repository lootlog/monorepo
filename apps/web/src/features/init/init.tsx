import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  useGuildsControllerGetGuildById,
} from "@/lib/api/generated/main/guilds/guilds";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { invalidateUsersControllerGetCurrentUserAccessibleGuilds } from "@/lib/api/generated/main/users/users";

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

    void invalidateUsersControllerGetCurrentUserAccessibleGuilds(
      queryClient,
    ).then(() => {
      navigate({ to: ROUTES.guild.base(guildData.id) });
    });
  }, [guildData, navigate, queryClient]);

  return (
    <div className="h-full flex flex-col">
      <FullScreenLoading />
    </div>
  );
};
