import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMembersControllerGetGuildMembersSummaryQueryKey,
  useMembersControllerGetGuildMembersSummary,
} from "@/lib/api/generated/main/members/members";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";

export const useMemberInvalidation = (
  guildId: string | undefined,
  memberIds: string | string[] | undefined,
) => {
  const queryClient = useQueryClient();
  const { data } = useMembersControllerGetGuildMembersSummary(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: getMembersControllerGetGuildMembersSummaryQueryKey({
          guildId: guildId ?? "",
        }),
        enabled: !!guildId,
        gcTime: Infinity,
        staleTime: 5 * 60 * 1000,
      },
    },
  );
  const guildMembers = mapGuildMembersByUserId(data);
  const checkedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!guildId || !memberIds || !data) return;

    const idsToCheck = Array.isArray(memberIds) ? memberIds : [memberIds];

    idsToCheck.forEach((memberId) => {
      if (!memberId) return;

      const checkKey = `${guildId}:${memberId}`;
      if (checkedIdsRef.current.has(checkKey)) return;

      const member = guildMembers[memberId];

      if (!member) {
        checkedIdsRef.current.add(checkKey);
        queryClient.invalidateQueries({
          queryKey: getMembersControllerGetGuildMembersSummaryQueryKey({
            guildId,
          }),
        });
      }
    });
  }, [data, guildId, guildMembers, memberIds, queryClient]);
};
