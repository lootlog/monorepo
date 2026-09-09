import type { ChatMessageResponseDtoOutput } from "@lootlog/client/main";
import { CHAT_MESSAGE_LIMIT } from "@lootlog/schema/chat";

type ChatReadEntry = {
  id: string;
  type: ChatMessageResponseDtoOutput["type"];
  attention: boolean;
  read: boolean;
};

export type ChatReadState = Record<string, ChatReadEntry[]>;

export const receiveChatMessage = (
  state: ChatReadState,
  message: ChatMessageResponseDtoOutput,
  attention: boolean,
) => {
  const entries = state[message.guildId] ?? [];
  if (entries.some((entry) => entry.id === message.id)) return state;
  return {
    ...state,
    [message.guildId]: [
      ...entries,
      { id: message.id, type: message.type, attention, read: false },
    ].slice(-CHAT_MESSAGE_LIMIT),
  };
};

export const markChatMessagesRead = (
  state: ChatReadState,
  messageIds: readonly string[],
) => {
  const visible = new Set(messageIds);
  let result = state;
  for (const [guildId, entries] of Object.entries(state)) {
    if (!entries.some((entry) => !entry.read && visible.has(entry.id)))
      continue;
    result = {
      ...result,
      [guildId]: entries.map((entry) =>
        visible.has(entry.id) ? { ...entry, read: true } : entry,
      ),
    };
  }
  return result;
};

export const prioritizeChatMessage = (
  state: ChatReadState,
  guildId: string,
  messageId: string,
) => {
  const entries = state[guildId];
  if (!entries?.some((entry) => entry.id === messageId && !entry.attention)) {
    return state;
  }
  return {
    ...state,
    [guildId]: entries.map((entry) =>
      entry.id === messageId ? { ...entry, attention: true } : entry,
    ),
  };
};

export const retainChatReadEntries = (
  state: ChatReadState,
  guildId: string,
  retainedIds: ReadonlySet<string>,
) => {
  const entries = state[guildId];
  if (!entries?.some((entry) => !retainedIds.has(entry.id))) return state;
  return {
    ...state,
    [guildId]: entries.filter((entry) => retainedIds.has(entry.id)),
  };
};

export const getChatUnreadSummary = (state: ChatReadState, guildId: string) => {
  const entries = (
    guildId === "all" ? Object.values(state).flat() : (state[guildId] ?? [])
  ).filter((entry) => !entry.read);
  return {
    ids: new Set(entries.map((entry) => entry.id)),
    attention: entries.filter((entry) => entry.attention).length,
    conversations: entries.some(
      (entry) => entry.type === "NORMAL" || entry.type === "NOTIFICATION",
    ),
    reports: entries.some(
      (entry) => entry.type === "NPC" || entry.type === "PARTY_GATHERING",
    ),
  };
};
