import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  getGuildMembersSummaryQueryKey,
  getGuildMembersSummaryQueryOptions,
} from "@/hooks/api/guild-members-summary-query";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/api-client/models/main/member-summary-response-dto-output";
import type { StoredNotification } from "@/store/notifications.store";

export type NotificationGuildMembersByGuildId = Record<
  string,
  Record<string, MemberSummaryResponseDtoOutput>
>;

export const useNotificationGuildMembers = (
  notifications: readonly StoredNotification[],
) => {
  const queryClient = useQueryClient();
  const invalidatedMemberKeysRef = useRef<Set<string>>(new Set());
  const memberQueryDataByGuildIdRef = useRef(
    new Map<string, MemberSummaryResponseDtoOutput[] | undefined>(),
  );
  const membersByGuildIdRef = useRef<NotificationGuildMembersByGuildId>({});
  const guildIds = [...new Set(notifications.map(({ guildId }) => guildId))];
  const memberQueries = useQueries({
    queries: guildIds.map((guildId) =>
      getGuildMembersSummaryQueryOptions({ guildId }),
    ),
  });
  const nextMemberQueryDataByGuildId = new Map<
    string,
    MemberSummaryResponseDtoOutput[] | undefined
  >();
  const nextMembersByGuildId: NotificationGuildMembersByGuildId = {};
  const previousMembersByGuildId = membersByGuildIdRef.current;
  let membersChanged =
    Object.keys(previousMembersByGuildId).length !== guildIds.length;

  guildIds.forEach((guildId, index) => {
    const memberQueryData = memberQueries[index]?.data;
    nextMemberQueryDataByGuildId.set(guildId, memberQueryData);

    const previousMemberQueryData =
      memberQueryDataByGuildIdRef.current.get(guildId);
    const previousGuildMembers = previousMembersByGuildId[guildId];
    if (previousGuildMembers && previousMemberQueryData === memberQueryData) {
      nextMembersByGuildId[guildId] = previousGuildMembers;
      return;
    }

    nextMembersByGuildId[guildId] = mapGuildMembersByUserId(memberQueryData);
    membersChanged = true;
  });

  memberQueryDataByGuildIdRef.current = nextMemberQueryDataByGuildId;
  if (membersChanged) {
    membersByGuildIdRef.current = nextMembersByGuildId;
  }
  const membersByGuildId = membersByGuildIdRef.current;

  useEffect(() => {
    const guildIdsToInvalidate = new Set<string>();
    const nextInvalidatedMemberKeys = new Set<string>();

    notifications.forEach((notification) => {
      const memberKey = `${notification.guildId}:${notification.discordId}`;

      if (invalidatedMemberKeysRef.current.has(memberKey)) {
        nextInvalidatedMemberKeys.add(memberKey);
        return;
      }

      const guildMembers = membersByGuildId[notification.guildId];

      if (!guildMembers || guildMembers[notification.discordId]) {
        return;
      }

      nextInvalidatedMemberKeys.add(memberKey);
      guildIdsToInvalidate.add(notification.guildId);
    });

    invalidatedMemberKeysRef.current = nextInvalidatedMemberKeys;

    guildIdsToInvalidate.forEach((guildId) => {
      void queryClient.invalidateQueries({
        queryKey: getGuildMembersSummaryQueryKey({ guildId }),
      });
    });
  }, [membersByGuildId, notifications, queryClient]);

  return membersByGuildId;
};
