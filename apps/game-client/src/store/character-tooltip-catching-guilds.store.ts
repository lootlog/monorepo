import type { Other } from "@lootlog/margonem/others";
import { create } from "zustand";
import type { UserLootlogPlayersCatchingGuildsResponseDtoOutputPlayersItemGuildsItem } from "@/lib/api/generated/main/model";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";

export type CharacterTooltipCatchingGuildsStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "unavailable";

export type CharacterTooltipCatchingGuildsEntry = {
  fetchedAt?: number;
  guilds: UserLootlogPlayersCatchingGuildsResponseDtoOutputPlayersItemGuildsItem[];
  requestKey?: string;
  status: CharacterTooltipCatchingGuildsStatus;
};

export type CharacterTooltipCatchingGuildsTarget = {
  accountId: string;
  characterId: string;
  key: string;
  ownerName?: string;
  playerName: string;
  requestKey: string;
  userId: string;
};

type CharacterTooltipCatchingGuildsState = {
  activeOther: Other | null;
  activeTarget: CharacterTooltipCatchingGuildsTarget | null;
  entriesByKey: Record<string, CharacterTooltipCatchingGuildsEntry | undefined>;
  isShiftPressed: boolean;
  clear: () => void;
  clearActiveOther: () => void;
  getEntry: (key: string) => CharacterTooltipCatchingGuildsEntry | undefined;
  setActiveOther: (other: Other) => void;
  setError: (target: CharacterTooltipCatchingGuildsTarget) => void;
  setIdle: (target: CharacterTooltipCatchingGuildsTarget) => void;
  setLoading: (target: CharacterTooltipCatchingGuildsTarget) => void;
  setShiftPressed: (isShiftPressed: boolean) => void;
  setSuccess: (
    target: CharacterTooltipCatchingGuildsTarget,
    guilds: UserLootlogPlayersCatchingGuildsResponseDtoOutputPlayersItemGuildsItem[],
    fetchedAt: number,
  ) => void;
  setUnavailable: (key: string) => void;
};

export function getCharacterTooltipCatchingGuildsCharacterKey(
  accountId: string,
  characterId: string,
): string {
  return `${accountId}:${characterId}`;
}

export function getOtherCatchingGuildsTarget(
  other: Other,
): CharacterTooltipCatchingGuildsTarget | null {
  const accountId = String(other.d?.account ?? "");
  const characterId = String(other.d?.id ?? "");

  if (!accountId || !characterId) {
    return null;
  }

  const owner = useOnlineCharacterOwnersStore
    .getState()
    .getOwner(accountId, characterId);
  if (!owner) {
    return null;
  }

  return {
    accountId,
    characterId,
    key: getCharacterTooltipCatchingGuildsCharacterKey(accountId, characterId),
    ownerName: owner.guildMemberName ?? owner.userId,
    playerName: owner.playerName,
    requestKey: `${owner.userId}:${accountId}:${characterId}`,
    userId: owner.userId,
  };
}

function canApplyTargetEntry(
  entry: CharacterTooltipCatchingGuildsEntry | undefined,
  target: CharacterTooltipCatchingGuildsTarget,
): boolean {
  return !entry || entry.requestKey === target.requestKey;
}

export const useCharacterTooltipCatchingGuildsStore =
  create<CharacterTooltipCatchingGuildsState>()((set, get) => ({
    activeOther: null,
    activeTarget: null,
    entriesByKey: {},
    isShiftPressed: false,
    clear: () =>
      set({
        activeOther: null,
        activeTarget: null,
        entriesByKey: {},
        isShiftPressed: false,
      }),
    clearActiveOther: () =>
      set((state) => {
        if (!state.activeOther && !state.activeTarget) return state;

        return { activeOther: null, activeTarget: null };
      }),
    getEntry: (key) => get().entriesByKey[key],
    setActiveOther: (other) =>
      set((state) => {
        const activeTarget = getOtherCatchingGuildsTarget(other);
        if (
          state.activeOther === other &&
          state.activeTarget?.key === activeTarget?.key
        ) {
          return state;
        }

        return { activeOther: other, activeTarget };
      }),
    setError: (target) =>
      set((state) => {
        if (!canApplyTargetEntry(state.entriesByKey[target.key], target)) {
          return state;
        }

        return {
          entriesByKey: {
            ...state.entriesByKey,
            [target.key]: {
              guilds: [],
              requestKey: target.requestKey,
              status: "error",
            },
          },
        };
      }),
    setIdle: (target) =>
      set((state) => ({
        entriesByKey: {
          ...state.entriesByKey,
          [target.key]: {
            guilds: [],
            requestKey: target.requestKey,
            status: "idle",
          },
        },
      })),
    setLoading: (target) =>
      set((state) => {
        if (!canApplyTargetEntry(state.entriesByKey[target.key], target)) {
          return state;
        }

        return {
          entriesByKey: {
            ...state.entriesByKey,
            [target.key]: {
              guilds: state.entriesByKey[target.key]?.guilds ?? [],
              requestKey: target.requestKey,
              status: "loading",
            },
          },
        };
      }),
    setShiftPressed: (isShiftPressed) =>
      set((state) => {
        if (state.isShiftPressed === isShiftPressed) return state;

        return { isShiftPressed };
      }),
    setSuccess: (target, guilds, fetchedAt) =>
      set((state) => {
        if (!canApplyTargetEntry(state.entriesByKey[target.key], target)) {
          return state;
        }

        return {
          entriesByKey: {
            ...state.entriesByKey,
            [target.key]: {
              fetchedAt,
              guilds,
              requestKey: target.requestKey,
              status: "success",
            },
          },
        };
      }),
    setUnavailable: (key) =>
      set((state) => {
        if (state.entriesByKey[key]?.status === "unavailable") {
          return state;
        }

        return {
          entriesByKey: {
            ...state.entriesByKey,
            [key]: {
              guilds: [],
              status: "unavailable",
            },
          },
        };
      }),
  }));
