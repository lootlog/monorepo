import type { GlobalChatStats } from "@lootlog/schema/chat";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addRecentWorld } from "@/lib/recent-worlds";
import { storageKey } from "@/lib/storage-key";
import { createChangedOnlyStorage } from "./changed-only-storage";

const STORAGE_KEY = storageKey("ll:global-chat");

export type GlobalChatChannel = string;

export const GLOBAL_CHAT_SHARED_CHANNEL: GlobalChatChannel = "";

export const getGlobalChatChannel = (world: string | undefined) =>
  world ?? GLOBAL_CHAT_SHARED_CHANNEL;

export const getGlobalChatWorld = (channel: GlobalChatChannel) =>
  channel === GLOBAL_CHAT_SHARED_CHANNEL ? undefined : channel;

interface GlobalChatState {
  selectedChannel: GlobalChatChannel | null;
  selectChannel: (channel: GlobalChatChannel) => void;
  recentWorlds: string[];
  stats:
    | (Omit<GlobalChatStats, "world"> & { channel: GlobalChatChannel })
    | null;
  setStats: (stats: GlobalChatStats) => void;
  unread: number;
  addUnread: () => void;
  clearUnread: () => void;
}

export const useGlobalChatStore = create<GlobalChatState>()(
  persist(
    (set) => ({
      selectedChannel: null,
      selectChannel: (channel) =>
        set((state) => ({
          selectedChannel: channel,
          recentWorlds:
            channel === GLOBAL_CHAT_SHARED_CHANNEL
              ? state.recentWorlds
              : addRecentWorld(state.recentWorlds, channel),
          stats: null,
          unread: 0,
        })),
      recentWorlds: [],
      stats: null,
      setStats: ({ world, online, listeners }) =>
        set({
          stats: { channel: getGlobalChatChannel(world), online, listeners },
        }),
      unread: 0,
      addUnread: () => set((state) => ({ unread: state.unread + 1 })),
      clearUnread: () => set({ unread: 0 }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        selectedChannel: state.selectedChannel,
        recentWorlds: state.recentWorlds,
      }),
      storage: createChangedOnlyStorage(createJSONStorage(() => localStorage)),
    },
  ),
);
