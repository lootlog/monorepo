import {
  getMembersControllerGetGuildMemberReferencesQueryKey,
  useMembersControllerGetGuildMemberReferences,
} from "@lootlog/client/main";

const MEMBER_REFERENCES_PARAMS = { includeInactive: true };

/** Members by user id, including those who already left, so old entries keep their colour. */
export const useGuildMemberMap = (guildId: string | undefined) => {
  const { data: guildMembers } = useMembersControllerGetGuildMemberReferences(
    { guildId: guildId ?? "" },
    MEMBER_REFERENCES_PARAMS,
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getMembersControllerGetGuildMemberReferencesQueryKey(
          { guildId: guildId ?? "" },
          MEMBER_REFERENCES_PARAMS,
        ),
      },
    },
  );

  return new Map(guildMembers?.map((member) => [member.userId, member]) ?? []);
};
