import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ChatState {
  isIntegratedMode: boolean;
  toggleIntegratedMode: () => void;
  isNotificationEnabled: boolean;
  toggleNotificationEnabled: () => void;
  selectedInputGuildIds: string[];
  setSelectedInputGuildIds: (guildIds: string[]) => void;
  isChatInputEnabled: boolean;
  toggleChatInputEnabled: () => void;
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
    }),
    {
      name: "ll:chat:state",
      partialize: (state) => ({
        isIntegratedMode: state.isIntegratedMode,
        isNotificationEnabled: state.isNotificationEnabled,
        selectedInputGuildIds: state.selectedInputGuildIds,
        isChatInputEnabled: state.isChatInputEnabled,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
