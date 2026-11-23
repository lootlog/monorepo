import {
  getChatMentionMemberSuggestions,
  getChatMentionRoleSuggestions,
} from "@/features/chat/chat-mention-suggestions.helpers";
import { buildChatMentionContext } from "@/features/chat/chat-mentions.helpers";
import { CHAT_QUERY_GC_TIME_MS } from "@/features/chat/chat.constants";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import {
  useMembersControllerGetMe,
  useRolesControllerGetGuildRoles,
} from "@lootlog/client/main";
import { useGameStore } from "@/store/game.store";

const shouldLoadChatMentionData = (
  guildId: string,
  hasMentionInput: boolean,
  isCommandInput: boolean,
) => guildId !== "" && hasMentionInput && !isCommandInput;

const getChatMentionQueryData = <MemberItem, RoleItem>({
  members,
  roles,
}: {
  members: MemberItem[] | undefined;
  roles: RoleItem[] | undefined;
}) => ({
  members: members ?? [],
  roles: roles ?? [],
});

export function useChatMentionData({
  guildId,
  hasMentionInput,
  isCommandInput,
}: {
  guildId: string;
  hasMentionInput: boolean;
  isCommandInput: boolean;
}) {
  const currentCharacterNick = useGameStore(
    (state) => state.game?.hero.name ?? "",
  );

  const shouldLoadMentionData = shouldLoadChatMentionData(
    guildId,
    hasMentionInput,
    isCommandInput,
  );

  const guildMembersQuery = useGuildMembersSummary(
    { guildId },
    {
      query: {
        enabled: shouldLoadMentionData,
      },
    },
  );

  const guildRolesQuery = useRolesControllerGetGuildRoles(
    { guildId },
    {
      query: {
        enabled: shouldLoadMentionData,
        gcTime: CHAT_QUERY_GC_TIME_MS,
        staleTime: 5 * 60 * 1000,
      },
    },
  );

  const { members: guildMembers, roles: guildRoles } = getChatMentionQueryData({
    members: guildMembersQuery.data,
    roles: guildRolesQuery.data,
  });

  const { data: currentMember } = useMembersControllerGetMe(
    { guildId },
    {
      query: {
        enabled: shouldLoadMentionData,
        gcTime: CHAT_QUERY_GC_TIME_MS,
        staleTime: 5 * 60 * 1000,
      },
    },
  );

  return {
    isFetchingMemberNames: guildMembersQuery.isFetching,
    isFetchingRoleNames: guildRolesQuery.isFetching,
    memberSuggestions: getChatMentionMemberSuggestions(guildMembers),
    roleSuggestions: getChatMentionRoleSuggestions(guildRoles),
    mentionContext: buildChatMentionContext({
      currentCharacterNick,
      currentMember,
      members: guildMembers,
      roles: guildRoles,
    }),
  };
}
