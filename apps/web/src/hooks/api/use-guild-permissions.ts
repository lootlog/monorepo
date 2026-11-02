import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildPermissions } from "@lootlog/client/main";

export const useGuildPermissions = () => {
  const guildId = useGuildId();
  const queryGuildId = guildId ?? "";

  return useGuildsControllerGetGuildPermissions(
    { guildId: queryGuildId },
    {
      query: {
        select: (capabilities) => createAccessPolicy({ capabilities }),
        staleTime: 30_000,
      },
    },
  );
};
