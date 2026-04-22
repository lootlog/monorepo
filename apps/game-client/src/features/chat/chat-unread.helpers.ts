export type ChatUnreadCountByGuildId = Record<string, number>;

const MAX_CHAT_UNREAD_BADGE_COUNT = 9;

export const incrementChatUnreadCount = ({
  unreadCountByGuildId,
  guildId,
}: {
  unreadCountByGuildId: ChatUnreadCountByGuildId;
  guildId: string;
}) => {
  return {
    ...unreadCountByGuildId,
    [guildId]: (unreadCountByGuildId[guildId] ?? 0) + 1,
  };
};

export const clearChatUnreadCount = ({
  unreadCountByGuildId,
  guildId,
}: {
  unreadCountByGuildId: ChatUnreadCountByGuildId;
  guildId: string;
}) => {
  if (!(guildId in unreadCountByGuildId)) {
    return unreadCountByGuildId;
  }

  const { [guildId]: _removedUnreadCount, ...nextUnreadCountByGuildId } =
    unreadCountByGuildId;

  return nextUnreadCountByGuildId;
};

export const clearAllChatUnreadCounts = () => {
  return {};
};

export const formatChatUnreadBadge = (count?: number) => {
  if (!count || count <= 0) {
    return null;
  }

  if (count > MAX_CHAT_UNREAD_BADGE_COUNT) {
    return `${MAX_CHAT_UNREAD_BADGE_COUNT}+`;
  }

  return String(count);
};
