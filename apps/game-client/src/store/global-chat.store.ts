import type { GlobalChatStats } from "@lootlog/schema/chat";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addRecentWorld } from "@/lib/recent-worlds";
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
  /** World channels the player picked, most recent first. */
  recentWorlds: string[];
  /** The latest live counts the gateway sent for the followed channel. */
  stats:
    | (Omit<GlobalChatStats, "world"> & { channel: GlobalChatChannel })
    | null;
  setStats: (stats: GlobalChatStats) => void;
  /** Messages the followed channel received while its window was closed. */
  unread: number;
  addUnread: () => void;
  clearUnread: () => void;
  /** Emoji the player picked, most recent first. */
  recentEmoji: string[];
  addRecentEmoji: (emoji: string) => void;
}

const RECENT_EMOJI_LIMIT = 24;

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
      recentEmoji: [],
      addRecentEmoji: (emoji) =>
        set((state) => ({
          recentEmoji: [
            emoji,
            ...state.recentEmoji.filter((recent) => recent !== emoji),
          ].slice(0, RECENT_EMOJI_LIMIT),
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        selectedChannel: state.selectedChannel,
        recentWorlds: state.recentWorlds,
        recentEmoji: state.recentEmoji,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
