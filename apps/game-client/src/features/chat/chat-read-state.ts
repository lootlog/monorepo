import type { ChatMessageResponseDtoOutput } from "@lootlog/client/main";
import { CHAT_MESSAGE_LIMIT } from "@lootlog/schema/chat";
import type { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { isHiddenNpcChatMessage } from "./chat.helpers";

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
  if (message.type === "PARTY_GATHERING") return state;
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
    reports: entries.some((entry) => entry.type === "NPC"),
  };
};

type ReconcileChatReadStateInput = {
  allowedGuildIds: ReadonlySet<string>;
  failedGuildIds: ReadonlySet<string>;
  hiddenNpcTypes: ReadonlySet<NpcTypeEnum>;
  messagesByGuildId: Record<string, ChatMessageResponseDtoOutput[]>;
  hasAttention: (
    guildId: string,
    message: ChatMessageResponseDtoOutput,
  ) => boolean;
};

/**
 * Aligns persisted read entries with the messages the transcript can show:
 * drops revoked organizations, prunes entries the transcript no longer renders
 * (evicted, or hidden by a rank filter), and flags loaded mentions.
 */
export const reconcileChatReadState = (
  state: ChatReadState,
  {
    allowedGuildIds,
    failedGuildIds,
    hiddenNpcTypes,
    messagesByGuildId,
    hasAttention,
  }: ReconcileChatReadStateInput,
) => {
  let next = state;
  if (Object.keys(state).some((guildId) => !allowedGuildIds.has(guildId))) {
    next = Object.fromEntries(
      Object.entries(state).filter(([guildId]) => allowedGuildIds.has(guildId)),
    );
  }
  for (const [guildId, allMessages] of Object.entries(messagesByGuildId)) {
    if (failedGuildIds.has(guildId)) continue;
    const messages = allMessages.filter(
      (message) => !isHiddenNpcChatMessage(message, hiddenNpcTypes),
    );
    next = retainChatReadEntries(
      next,
      guildId,
      new Set(messages.map((message) => message.id)),
    );
    for (const message of messages) {
      if (hasAttention(guildId, message))
        next = prioritizeChatMessage(next, guildId, message.id);
    }
  }
  return next;
};
