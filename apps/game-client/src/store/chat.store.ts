import { isObjectRecord } from "@lootlog/schema/records";
import { z } from "zod";
import { useGameStore } from "@/store/game.store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import type { MessageType } from "@/api/chat.api";

const STORAGE_KEY = storageKey("ll:chat:state");

export type ChatFilter = "all" | "normal" | "npc" | "party" | "reports";

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
  chatFilter: ChatFilter;
  setChatFilter: (filter: ChatFilter) => void;
  filtersVisible: boolean;
  toggleFiltersVisible: () => void;
  draftsByGuild: Record<string, string>;
  setDraft: (guildId: string, message: string) => void;
  replyDraftsByGuild: Record<string, ChatReplyDraft | undefined>;
  focusRequest: { guildId: string; sequence: number } | null;
  requestComposeFocus: (guildId: string) => void;
  selectedGuildByCharacter: Record<string, string>;
  setSelectedChatGuildId: (guildId: string) => void;
  replyDraft: ChatReplyDraft | null;
  setReplyDraft: (replyDraft: ChatReplyDraft) => void;
  clearReplyDraft: (guildId?: string) => void;
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
      chatFilter: "all",
      setChatFilter: (filter) => {
        set(() => ({ chatFilter: filter }));
      },
      filtersVisible: true,
      toggleFiltersVisible: () => {
        set((state) => ({
          filtersVisible: !state.filtersVisible,
          chatFilter: state.filtersVisible ? "all" : state.chatFilter,
        }));
      },
      draftsByGuild: {},
      setDraft: (guildId, message) =>
        set((state) => ({
          draftsByGuild: { ...state.draftsByGuild, [guildId]: message },
        })),
      replyDraftsByGuild: {},
      focusRequest: null,
      requestComposeFocus: (guildId) =>
        set((state) => ({
          selectedGuildByCharacter: {
            ...state.selectedGuildByCharacter,
            [getChatCharacterKey()]: guildId,
          },
          focusRequest: {
            guildId,
            sequence: (state.focusRequest?.sequence ?? 0) + 1,
          },
        })),
      selectedGuildByCharacter: {},
      setSelectedChatGuildId: (guildId) =>
        set((state) => ({
          selectedGuildByCharacter: {
            ...state.selectedGuildByCharacter,
            [getChatCharacterKey()]: guildId,
          },
        })),
      replyDraft: null,
      setReplyDraft: (replyDraft) => {
        set((state) => ({
          replyDraft,
          selectedGuildByCharacter: {
            ...state.selectedGuildByCharacter,
            [getChatCharacterKey()]: replyDraft.guildId,
          },
          replyDraftsByGuild: {
            ...state.replyDraftsByGuild,
            [replyDraft.guildId]: replyDraft,
          },
          focusRequest: {
            guildId: replyDraft.guildId,
            sequence: (state.focusRequest?.sequence ?? 0) + 1,
          },
        }));
      },
      clearReplyDraft: (guildId) => {
        set((state) => ({
          replyDraft:
            !guildId || state.replyDraft?.guildId === guildId
              ? null
              : state.replyDraft,
          replyDraftsByGuild: {
            ...state.replyDraftsByGuild,
            [guildId ?? state.replyDraft?.guildId ?? ""]: undefined,
          },
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        selectedGuildByCharacter: state.selectedGuildByCharacter,
        isIntegratedMode: state.isIntegratedMode,
        isNotificationEnabled: state.isNotificationEnabled,
        selectedInputGuildIds: state.selectedInputGuildIds,
        chatFilter: state.chatFilter,
        filtersVisible: state.filtersVisible,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted) => {
        if (!isObjectRecord(persisted)) return { chatFilter: "all" as const };

        return { ...persisted, chatFilter: "all" as const };
      },
    },
  ),
);

const getChatCharacterKey = () => {
  const hero = useGameStore.getState().game?.hero;

  return `${hero?.accountId ?? ""}:${hero?.characterId ?? ""}`;
};

export const getSelectedChatGuildId = (
  state: Pick<ChatState, "selectedGuildByCharacter"> = useChatStore.getState(),
): string => {
  const key = getChatCharacterKey();
  const selected = state.selectedGuildByCharacter[key];

  if (selected !== undefined) return selected;

  // Preserve the existing per-character selector preference on first use.
  try {
    return z
      .string()
      .parse(
        JSON.parse(
          localStorage.getItem(storageKey(`ll:chat:selected-guild:${key}`)) ??
            '""',
        ),
      );
  } catch {
    return "";
  }
};
