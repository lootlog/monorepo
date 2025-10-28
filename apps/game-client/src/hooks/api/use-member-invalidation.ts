import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGuildMembers } from "@/hooks/api/use-guild-members";

export const useMemberInvalidation = (
  guildId: string | undefined,
  memberIds: string | string[] | undefined,
) => {
  const queryClient = useQueryClient();
  const { data: guildMembers } = useGuildMembers(guildId);
  const checkedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!guildId || !memberIds || !guildMembers) return;

    const idsToCheck = Array.isArray(memberIds) ? memberIds : [memberIds];

    idsToCheck.forEach((memberId) => {
      if (!memberId) return;

      const checkKey = `${guildId}:${memberId}`;
      if (checkedIdsRef.current.has(checkKey)) return;

      const member = guildMembers[memberId];

      if (!member) {
        checkedIdsRef.current.add(checkKey);
        queryClient.invalidateQueries({
          queryKey: ["guild-members", guildId],
        });
      }
    });
  }, [guildId, memberIds, guildMembers, queryClient]);
};
