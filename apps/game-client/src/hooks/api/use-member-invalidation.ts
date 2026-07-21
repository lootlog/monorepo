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
    if (!guildId || !memberIds || !data) {
      checkedIdsRef.current.clear();
      return;
    }

    const idsToCheck = Array.isArray(memberIds) ? memberIds : [memberIds];
    const nextCheckedIds = new Set<string>();
    let shouldInvalidate = false;

    idsToCheck.forEach((memberId) => {
      if (!memberId) return;

      const checkKey = `${guildId}:${memberId}`;
      const member = guildMembers[memberId];
      if (member) return;

      nextCheckedIds.add(checkKey);
      if (!checkedIdsRef.current.has(checkKey)) {
        shouldInvalidate = true;
      }
    });

    checkedIdsRef.current = nextCheckedIds;
    if (shouldInvalidate) {
      void queryClient.invalidateQueries({
        queryKey: getGuildMembersSummaryQueryKey({ guildId }),
      });
    }
  }, [data, guildId, guildMembers, memberIds, queryClient]);
};
