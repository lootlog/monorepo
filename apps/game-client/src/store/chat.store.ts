import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import { performanceStoreMiddleware } from "@/lib/performance-monitoring/store-middleware";
import type { MessageType } from "@/api/chat.api";

const STORAGE_KEY = storageKey("ll:chat:state");

export type ChatFilter = "all" | "normal" | "npc" | "party";
type ReplyableMessageType = Extract<MessageType, "NORMAL" | "NOTIFICATION">;

export type ChatReplyDraft = {
  guildId: string;
  messageId: string;
  senderNick: string;
  message: string;
  type: ReplyableMessageType;
};

interface ChatState {
  isIntegratedMode: boolean;
  toggleIntegratedMode: () => void;
  isNotificationEnabled: boolean;
  toggleNotificationEnabled: () => void;
  selectedInputGuildIds: string[];
  setSelectedInputGuildIds: (guildIds: string[]) => void;
  isChatInputEnabled: boolean;
  toggleChatInputEnabled: () => void;
  setChatInputEnabled: (enabled: boolean) => void;
  chatFilter: ChatFilter;
  setChatFilter: (filter: ChatFilter) => void;
  filtersVisible: boolean;
  toggleFiltersVisible: () => void;
  replyDraft: ChatReplyDraft | null;
  setReplyDraft: (replyDraft: ChatReplyDraft) => void;
  clearReplyDraft: () => void;
}

export const useChatStore = create<ChatState>()(
  performanceStoreMiddleware(
    "chat",
    persist(
      (set) => ({
        isIntegratedMode: false,
        toggleIntegratedMode: () => {
          set((state) => ({
            isIntegratedMode: !state.isIntegratedMode,
          }));
        },
        isNotificationEnabled: false,
        toggleNotificationEnabled: () => {
          set((state) => ({
            isNotificationEnabled: !state.isNotificationEnabled,
          }));
        },
        selectedInputGuildIds: [],
        setSelectedInputGuildIds: (guildIds) => {
          set(() => ({
            selectedInputGuildIds: guildIds,
          }));
        },
        isChatInputEnabled: true,
        toggleChatInputEnabled: () => {
          set((state) => ({
            isChatInputEnabled: !state.isChatInputEnabled,
          }));
        },
        setChatInputEnabled: (enabled) => {
          set(() => ({
            isChatInputEnabled: enabled,
          }));
        },
        chatFilter: "all",
        setChatFilter: (filter) => {
          set(() => ({ chatFilter: filter }));
        },
        filtersVisible: false,
        toggleFiltersVisible: () => {
          set((state) => ({
            filtersVisible: !state.filtersVisible,
            chatFilter: state.filtersVisible ? "all" : state.chatFilter,
          }));
        },
        replyDraft: null,
        setReplyDraft: (replyDraft) => {
          set(() => ({ replyDraft }));
        },
        clearReplyDraft: () => {
          set(() => ({ replyDraft: null }));
        },
      }),
      {
        name: STORAGE_KEY,
        partialize: (state) => ({
          isIntegratedMode: state.isIntegratedMode,
          isNotificationEnabled: state.isNotificationEnabled,
          selectedInputGuildIds: state.selectedInputGuildIds,
          isChatInputEnabled: state.isChatInputEnabled,
          chatFilter: state.chatFilter,
          filtersVisible: state.filtersVisible,
        }),
        storage: createJSONStorage(() => localStorage),
        version: 1,
      },
    ),
    (state) => state.selectedInputGuildIds.length,
  ),
);
