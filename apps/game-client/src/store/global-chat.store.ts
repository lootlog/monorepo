import type { GlobalChatStats } from "@lootlog/schema/chat";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:global-chat");

/**
 * A global chat channel: a world's name, or `GLOBAL_CHAT_SHARED_CHANNEL` for
 * the channel every world shares. World names are never empty.
 */
export type GlobalChatChannel = string;

export const GLOBAL_CHAT_SHARED_CHANNEL: GlobalChatChannel = "";

/** The channel of a message or event whose world is absent when shared. */
export const getGlobalChatChannel = (world: string | undefined) =>
  world ?? GLOBAL_CHAT_SHARED_CHANNEL;

/** The `world` the API and gateway expect for a channel. */
export const getGlobalChatWorld = (channel: GlobalChatChannel) =>
  channel === GLOBAL_CHAT_SHARED_CHANNEL ? undefined : channel;

interface GlobalChatState {
  /** The channel the player last picked; null until they pick one. */
  selectedChannel: GlobalChatChannel | null;
  selectChannel: (channel: GlobalChatChannel) => void;
  /** The latest live counts the gateway sent for the followed channel. */
  stats:
    | (Omit<GlobalChatStats, "world"> & { channel: GlobalChatChannel })
    | null;
  setStats: (stats: GlobalChatStats) => void;
  /** Messages the followed channel received while its window was closed. */
  unread: number;
  addUnread: () => void;
  clearUnread: () => void;
}

export const useGlobalChatStore = create<GlobalChatState>()(
  persist(
    (set) => ({
      selectedChannel: null,
      selectChannel: (channel) =>
        set({ selectedChannel: channel, stats: null, unread: 0 }),
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
      partialize: (state) => ({ selectedChannel: state.selectedChannel }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
