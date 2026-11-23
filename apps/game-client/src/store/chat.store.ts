import { omit } from "es-toolkit";
import { isObjectRecord } from "@lootlog/schema/records";
import { Option, Schema } from "effect";
import { useGameStore } from "@/store/game.store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import { createChangedOnlyStorage } from "./changed-only-storage";
import type { MessageType } from "@/api/chat.api";

const STORAGE_KEY = storageKey("ll:chat:state");

const decodeLegacySelectedGuild = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.String),
);

export type ChatFilter = "all" | "normal" | "reports";

export type ChatDefaultComposeMode = "message" | "notification";

type ReplyableMessageType = Extract<MessageType, "NORMAL" | "NOTIFICATION">;

export type ChatReplyDraft = {
  guildId: string;
  messageId: string;
  senderNick: string;
  message: string;
  type: ReplyableMessageType;
};

interface ChatState {
  commandGuildId: string | null;
  setCommandGuildId: (guildId: string) => void;
  chatFilter: ChatFilter;
  setChatFilter: (filter: ChatFilter) => void;
  filtersVisible: boolean;
  toggleFiltersVisible: () => void;
  defaultComposeMode: ChatDefaultComposeMode;
  setDefaultComposeMode: (mode: ChatDefaultComposeMode) => void;
  draftsByGuild: Record<string, string>;
  setDraft: (guildId: string, message: string) => void;
  clearDraft: (guildId: string) => void;
  replyDraftsByGuild: Record<string, ChatReplyDraft | undefined>;
  focusRequest: { guildId: string; sequence: number } | null;
  selectedGuildByCharacter: Record<string, string>;
  setSelectedChatGuildId: (guildId: string) => void;
  setReplyDraft: (replyDraft: ChatReplyDraft) => void;
  clearReplyDraft: (guildId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      commandGuildId: null,
      setCommandGuildId: (guildId) => set({ commandGuildId: guildId }),
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
      defaultComposeMode: "message",
      setDefaultComposeMode: (mode) => set({ defaultComposeMode: mode }),
      draftsByGuild: {},
      setDraft: (guildId, message) =>
        set((state) => ({
          draftsByGuild: { ...state.draftsByGuild, [guildId]: message },
        })),
      clearDraft: (guildId) =>
        set((state) => ({
          draftsByGuild: omit(state.draftsByGuild, [guildId]),
        })),
      replyDraftsByGuild: {},
      focusRequest: null,
      selectedGuildByCharacter: {},
      setSelectedChatGuildId: (guildId) =>
        set((state) => ({
          selectedGuildByCharacter: {
            ...state.selectedGuildByCharacter,
            [getChatCharacterKey()]: guildId,
          },
        })),
      setReplyDraft: (replyDraft) => {
        set((state) => ({
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
          replyDraftsByGuild: omit(state.replyDraftsByGuild, [guildId]),
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        selectedGuildByCharacter: state.selectedGuildByCharacter,
        commandGuildId: state.commandGuildId,
        chatFilter: state.chatFilter,
        filtersVisible: state.filtersVisible,
        defaultComposeMode: state.defaultComposeMode,
      }),
      storage: createChangedOnlyStorage(createJSONStorage(() => localStorage)),
      version: 2,
      migrate: (persisted) => {
        if (!isObjectRecord(persisted)) return { chatFilter: "all" as const };

        return { ...persisted, chatFilter: "all" as const };
      },
      merge: (persisted, current) => {
        if (!isObjectRecord(persisted)) return current;

        const { chatFilter, defaultComposeMode } = persisted;

        return {
          ...current,
          ...omit(persisted, ["isIntegratedMode"]),
          chatFilter:
            chatFilter === "normal" || chatFilter === "reports"
              ? chatFilter
              : chatFilter === "npc" || chatFilter === "party"
                ? "reports"
                : "all",
          defaultComposeMode:
            defaultComposeMode === "notification" ? "notification" : "message",
        };
      },
    },
  ),
);

const getChatCharacterKey = () => {
  const hero = useGameStore.getState().game?.hero;

  return `${hero?.accountId ?? ""}:${hero?.characterId ?? ""}`;
};

const legacySelectedGuildByCharacter = new Map<string, string>();

const readLegacySelectedGuild = (key: string): string => {
  try {
    return Option.getOrElse(
      decodeLegacySelectedGuild(
        localStorage.getItem(storageKey(`ll:chat:selected-guild:${key}`)) ??
          '""',
      ),
      () => "",
    );
  } catch {
    return "";
  }
};

export const getSelectedChatGuildId = (
  state: Pick<ChatState, "selectedGuildByCharacter"> = useChatStore.getState(),
): string => {
  const key = getChatCharacterKey();
  const selected = state.selectedGuildByCharacter[key];

  if (selected !== undefined) return selected;
  let legacy = legacySelectedGuildByCharacter.get(key);

  if (legacy === undefined) {
    legacy = readLegacySelectedGuild(key);
    legacySelectedGuildByCharacter.set(key, legacy);
  }

  return legacy;
};
