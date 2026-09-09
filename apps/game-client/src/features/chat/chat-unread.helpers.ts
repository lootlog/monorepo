const MAX_CHAT_UNREAD_BADGE_COUNT = 9;

export const formatChatUnreadBadge = (count?: number) => {
  if (!count || count <= 0) {
    return null;
  }

  if (count > MAX_CHAT_UNREAD_BADGE_COUNT) {
    return `${MAX_CHAT_UNREAD_BADGE_COUNT}+`;
  }

  return String(count);
};
