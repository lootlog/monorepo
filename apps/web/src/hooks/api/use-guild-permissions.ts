import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  useGuildsControllerGetGuildPermissions,
} from "@/lib/api/generated/main/guilds/guilds";

export const useGuildPermissions = () => {
  const guildId = useGuildId();
  const queryGuildId = guildId ?? "";

  return useGuildsControllerGetGuildPermissions(
    { guildId: queryGuildId },
    {
      query: {
        queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
          guildId: queryGuildId,
        }),
        staleTime: 30_000,
      },
    },
  );
};
