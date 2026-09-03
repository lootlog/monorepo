import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  getGuildMembersSummaryQueryKey,
  getGuildMembersSummaryQueryOptions,
} from "@/hooks/api/guild-members-summary-query";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/client/main";
import type { StoredNotification } from "@/store/notifications.store";

export type NotificationGuildMembersByGuildId = Record<
  string,
  Record<string, MemberSummaryResponseDtoOutput>
>;

type MembersLookupCache = {
  memberDataByGuildId: Map<
    string,
    MemberSummaryResponseDtoOutput[] | undefined
  >;
  membersByGuildId: NotificationGuildMembersByGuildId;
};

const membersLookupCacheByOwner = new WeakMap<object, MembersLookupCache>();

const getStableMembersLookup = (
  cacheOwner: object,
  guildIds: readonly string[],
  memberDataByGuildId: readonly (
    | MemberSummaryResponseDtoOutput[]
    | undefined
  )[],
) => {
  const cachedLookup = membersLookupCacheByOwner.get(cacheOwner);
  const unchanged =
    guildIds.length === memberDataByGuildId.length &&
    cachedLookup?.memberDataByGuildId.size === guildIds.length &&
    guildIds.every(
      (guildId, index) =>
        cachedLookup.memberDataByGuildId.get(guildId) ===
        memberDataByGuildId[index],
    );
  if (unchanged && cachedLookup) return cachedLookup.membersByGuildId;

  const nextMemberDataByGuildId = new Map<
    string,
    MemberSummaryResponseDtoOutput[] | undefined
  >();
  const nextMembersByGuildId: NotificationGuildMembersByGuildId = {};
  guildIds.forEach((guildId, index) => {
    const memberData = memberDataByGuildId[index];
    nextMemberDataByGuildId.set(guildId, memberData);
    nextMembersByGuildId[guildId] =
      cachedLookup &&
      cachedLookup.memberDataByGuildId.get(guildId) === memberData
        ? cachedLookup.membersByGuildId[guildId]
        : mapGuildMembersByUserId(memberData);
  });
  const nextCache = {
    memberDataByGuildId: nextMemberDataByGuildId,
    membersByGuildId: nextMembersByGuildId,
  };
  membersLookupCacheByOwner.set(cacheOwner, nextCache);
  return nextMembersByGuildId;
};

export const useNotificationGuildMembers = (
  notifications: readonly StoredNotification[],
) => {
  const queryClient = useQueryClient();
  const [cacheOwner] = useState(() => ({}));
  const invalidatedMemberKeysRef = useRef<Set<string>>(new Set());
  const guildIds = [...new Set(notifications.map(({ guildId }) => guildId))];
  const memberQueries = useQueries({
    queries: guildIds.map((guildId) =>
      getGuildMembersSummaryQueryOptions({ guildId }),
    ),
  });
  const membersByGuildId = getStableMembersLookup(
    cacheOwner,
    guildIds,
    memberQueries.map((query) => query.data),
  );

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
