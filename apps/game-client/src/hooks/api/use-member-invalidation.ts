import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGuildMembersSummaryQueryKey,
  useGuildMembersSummary,
} from "@/hooks/api/guild-members-summary-query";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";

export const useMemberInvalidation = (
  guildId: string | undefined,
  memberIds: string | string[] | undefined,
) => {
  const queryClient = useQueryClient();
  const { data } = useGuildMembersSummary(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: !!guildId,
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
          queryKey: getGuildMembersSummaryQueryKey({
            guildId,
          }),
        });
      }
    });
  }, [data, guildId, guildMembers, memberIds, queryClient]);
};
