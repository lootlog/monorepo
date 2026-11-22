import { useMembersControllerGetMe } from "@lootlog/client/main";

export const useCurrentMember = (guildId: string | undefined) =>
  useMembersControllerGetMe(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: Boolean(guildId),
        staleTime: 30_000,
      },
    },
  );
