import type { Other } from "@lootlog/margonem/others";
import { create } from "zustand";
import type { UserLootlogPlayerCatchingGuildsResponseDtoOutputGuildsItem } from "@/lib/api/generated/main/model";

export type CharacterTooltipCatchingGuildsStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

export type CharacterTooltipCatchingGuildsEntry = {
  guilds: UserLootlogPlayerCatchingGuildsResponseDtoOutputGuildsItem[];
  status: CharacterTooltipCatchingGuildsStatus;
};

export type CharacterTooltipCatchingGuildsTarget = {
  accountId: string;
  characterId: string;
  key: string;
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
  setError: (key: string) => void;
  setLoading: (key: string) => void;
  setShiftPressed: (isShiftPressed: boolean) => void;
  setSuccess: (
    key: string,
    guilds: UserLootlogPlayerCatchingGuildsResponseDtoOutputGuildsItem[],
  ) => void;
};

export function getOtherCatchingGuildsTarget(
  other: Other,
): CharacterTooltipCatchingGuildsTarget | null {
  const accountId = String(other.d?.account ?? "");
  const characterId = String(other.d?.id ?? "");

  if (!accountId || !characterId) {
    return null;
  }

  return {
    accountId,
    characterId,
    key: `${accountId}:${characterId}`,
  };
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
    setError: (key) =>
      set((state) => ({
        entriesByKey: {
          ...state.entriesByKey,
          [key]: {
            guilds: [],
            status: "error",
          },
        },
      })),
    setLoading: (key) =>
      set((state) => ({
        entriesByKey: {
          ...state.entriesByKey,
          [key]: {
            guilds: state.entriesByKey[key]?.guilds ?? [],
            status: "loading",
          },
        },
      })),
    setShiftPressed: (isShiftPressed) =>
      set((state) => {
        if (state.isShiftPressed === isShiftPressed) return state;

        return { isShiftPressed };
      }),
    setSuccess: (key, guilds) =>
      set((state) => ({
        entriesByKey: {
          ...state.entriesByKey,
          [key]: {
            guilds,
            status: "success",
          },
        },
      })),
  }));
