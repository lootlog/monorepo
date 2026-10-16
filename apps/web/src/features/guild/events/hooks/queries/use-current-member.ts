import {
  getMembersControllerGetMeQueryKey,
  useMembersControllerGetMe,
} from "@lootlog/client/main";

/** The signed-in User's Member in the Organization, to find them in rankings. */
export const useCurrentMember = (guildId: string | undefined) =>
  useMembersControllerGetMe(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getMembersControllerGetMeQueryKey({ guildId: guildId ?? "" }),
        staleTime: 30_000,
      },
    },
  );
