import { useQueries } from "@tanstack/react-query";
import {
  chatControllerGetChatMessages,
  getChatControllerGetChatMessagesQueryKey,
} from "@/lib/api/generated/main/chat/chat";
import {
  getMembersControllerGetGuildMembersSummaryQueryKey,
  getMembersControllerGetMeQueryKey,
  membersControllerGetGuildMembersSummary,
  membersControllerGetMe,
} from "@/lib/api/generated/main/members/members";
import {
  getRolesControllerGetGuildRolesQueryKey,
  rolesControllerGetGuildRoles,
} from "@/lib/api/generated/main/roles/roles";
import {
  getGuildIds,
  mapGuildMembersByUserId,
} from "@/lib/api/generated-helpers";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  GuildResponseDtoOutput,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@/lib/api/generated/main/model";
import {
  buildChatMentionContext,
  hasChatMentionToken,
  type ChatMentionContext,
} from "@/features/chat/chat-mentions.helpers";

type UseChatGuildDataOptions = {
  currentCharacterNick: string;
  guilds?: GuildResponseDtoOutput[];
  selectedGuildId?: string;
};

type ChatGuildData = {
  memberLookup: Record<string, GuildMember>;
  mentionContext: ChatMentionContext;
  messages: ChatMessageType[];
};

export const useChatGuildData = ({
  currentCharacterNick,
  guilds,
  selectedGuildId,
}: UseChatGuildDataOptions) => {
  const guildIds = getGuildIds(guilds);
  const guildIdsToLoad =
    selectedGuildId === "all"
      ? guildIds
      : selectedGuildId
        ? [selectedGuildId]
        : [];

  const messageQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getChatControllerGetChatMessagesQueryKey({ guildId }),
      queryFn: () => chatControllerGetChatMessages({ guildId }),
      enabled: Boolean(guildId),
      gcTime: Infinity,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const memberQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getMembersControllerGetGuildMembersSummaryQueryKey({ guildId }),
      queryFn: () => membersControllerGetGuildMembersSummary({ guildId }),
      enabled: Boolean(guildId),
      gcTime: Infinity,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const hasMentionCandidatesByGuildId = guildIdsToLoad.reduce<
    Record<string, boolean>
  >((result, guildId, index) => {
    const messages = (messageQueries[index]?.data ?? []) as ChatMessageType[];

    result[guildId] = messages.some((message) => {
      return hasChatMentionToken(message.message);
    });

    return result;
  }, {});
  const currentMemberQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getMembersControllerGetMeQueryKey({ guildId }),
      queryFn: () => membersControllerGetMe({ guildId }),
      enabled: Boolean(guildId) && hasMentionCandidatesByGuildId[guildId],
      gcTime: Infinity,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const roleQueries = useQueries({
    queries: guildIdsToLoad.map((guildId) => ({
      queryKey: getRolesControllerGetGuildRolesQueryKey({ guildId }),
      queryFn: () => rolesControllerGetGuildRoles({ guildId }),
      enabled: Boolean(guildId) && hasMentionCandidatesByGuildId[guildId],
      gcTime: Infinity,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const guildDataById = guildIdsToLoad.reduce<Record<string, ChatGuildData>>(
    (result, guildId, index) => {
      const messages = (messageQueries[index]?.data ?? []) as ChatMessageType[];
      const members = (memberQueries[index]?.data ?? []) as GuildMember[];

      result[guildId] = {
        messages,
        memberLookup: mapGuildMembersByUserId(members),
        mentionContext: buildChatMentionContext({
          currentCharacterNick,
          currentMember: currentMemberQueries[index]?.data,
          members,
          messages,
          roles: roleQueries[index]?.data,
        }),
      };

      return result;
    },
    {},
  );

  const messagesByGuildId = Object.fromEntries(
    Object.entries(guildDataById).map(([guildId, guildData]) => [
      guildId,
      guildData.messages,
    ]),
  ) as Record<string, ChatMessageType[]>;
  const membersByGuildId = Object.fromEntries(
    Object.entries(guildDataById).map(([guildId, guildData]) => [
      guildId,
      guildData.memberLookup,
    ]),
  ) as Record<string, Record<string, GuildMember>>;
  const mentionContextsByGuildId = Object.fromEntries(
    Object.entries(guildDataById).map(([guildId, guildData]) => [
      guildId,
      guildData.mentionContext,
    ]),
  ) as Record<string, ChatMentionContext>;

  return {
    guildIdsToLoad,
    membersByGuildId,
    mentionContextsByGuildId,
    messagesByGuildId,
  };
};
