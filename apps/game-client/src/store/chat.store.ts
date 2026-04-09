import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:chat:state");

export type ChatFilter = "all" | "normal" | "npc" | "party";

interface ChatState {
  isIntegratedMode: boolean;
  toggleIntegratedMode: () => void;
  isNotificationEnabled: boolean;
  toggleNotificationEnabled: () => void;
  selectedInputGuildIds: string[];
  setSelectedInputGuildIds: (guildIds: string[]) => void;
  isChatInputEnabled: boolean;
  toggleChatInputEnabled: () => void;
  chatFilter: ChatFilter;
  setChatFilter: (filter: ChatFilter) => void;
  filtersVisible: boolean;
  toggleFiltersVisible: () => void;
}

export const useChatStore = create<ChatState>()(
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
);
