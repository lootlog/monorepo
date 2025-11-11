import { ChatMessage } from "@/hooks/api/use-chat-messages";
import { GuildMember } from "@/hooks/api/use-guild-members";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface ChatCache {
  messageCache: Record<string, ChatMessage[]>;
  memberCache: Record<string, Record<string, GuildMember>>;
  getAllMessages: () => ChatMessage[];
}

export const useChatCache = create(
  subscribeWithSelector<
    ChatCache & {
      appendMessage: (channel: string, message: ChatMessage) => void;
      setMessageCache: (channel: string, messages: ChatMessage[]) => void;
      setMemberCache: (
        channel: string,
        members: Record<string, GuildMember>,
      ) => void;
      chatInputInsertValue: string;
      setChatInputInsertValue: (value: string) => void;
      chatInputNickValue: string;
      setChatInputNickValue: (value: string) => void;
    }
  >((set, get) => ({
    messageCache: {},
    memberCache: {},
    chatInputInsertValue: "",
    chatInputNickValue: "",

    setChatInputNickValue: (value) => set({ chatInputNickValue: value }),
    setChatInputInsertValue: (value) => set({ chatInputInsertValue: value }),
    setMessageCache: (channel, messages) =>
      set((state) => ({
        messageCache: { ...state.messageCache, [channel]: messages },
      })),

    setMemberCache: (channel, members) =>
      set((state) => ({
        memberCache: { ...state.memberCache, [channel]: members },
      })),

    appendMessage: (channel, message) =>
      set((state) => ({
        messageCache: {
          ...state.messageCache,
          [channel]: [...(state.messageCache[channel] ?? []), message],
        },
      })),

    getAllMessages: () => {
      const cache = get().messageCache;

      return (Object.values(cache).flat() as ChatMessage[])
        .filter((m) => !!m.timestamp)
        .sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });
    },
  })),
);
