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
  lastAccessedAt: number;
  requestKey?: string;
  status: CharacterTooltipCatchingGuildsStatus;
};

export const CHARACTER_TOOLTIP_ENTRY_CAP = 500;
export const CHARACTER_TOOLTIP_ENTRY_TTL_MS = 5 * 60 * 1000;

const visibleEntryKeys = new Set<string>();

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
  pruneEntries: (visibleKeys: string[], now: number) => void;
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

function withEntryRetention(
  entriesByKey: Record<string, CharacterTooltipCatchingGuildsEntry | undefined>,
  now: number,
  activeKey?: string,
): Record<string, CharacterTooltipCatchingGuildsEntry | undefined> {
  const protectedKeys = new Set(visibleEntryKeys);
  if (activeKey) protectedKeys.add(activeKey);

  const protectedEntries: [string, CharacterTooltipCatchingGuildsEntry][] = [];
  const inactiveEntries: [string, CharacterTooltipCatchingGuildsEntry][] = [];
  let definedEntryCount = 0;

  for (const [key, entry] of Object.entries(entriesByKey)) {
    if (!entry) continue;
    definedEntryCount += 1;

    if (protectedKeys.has(key)) {
      protectedEntries.push([key, entry]);
    } else if (now - entry.lastAccessedAt <= CHARACTER_TOOLTIP_ENTRY_TTL_MS) {
      inactiveEntries.push([key, entry]);
    }
  }

  if (
    definedEntryCount === Object.keys(entriesByKey).length &&
    protectedEntries.length + inactiveEntries.length === definedEntryCount &&
    inactiveEntries.length <= CHARACTER_TOOLTIP_ENTRY_CAP
  ) {
    return entriesByKey;
  }

  inactiveEntries.sort(([, firstEntry], [, secondEntry]) => {
    return secondEntry.lastAccessedAt - firstEntry.lastAccessedAt;
  });

  return Object.fromEntries([
    ...protectedEntries,
    ...inactiveEntries.slice(0, CHARACTER_TOOLTIP_ENTRY_CAP),
  ]);
}

export const useCharacterTooltipCatchingGuildsStore =
  create<CharacterTooltipCatchingGuildsState>()((set, get) => ({
    activeOther: null,
    activeTarget: null,
    entriesByKey: {},
    isShiftPressed: false,
    clear: () => {
      visibleEntryKeys.clear();
      set({
        activeOther: null,
        activeTarget: null,
        entriesByKey: {},
        isShiftPressed: false,
      });
    },
    clearActiveOther: () =>
      set((state) => {
        if (!state.activeOther && !state.activeTarget) return state;

        return { activeOther: null, activeTarget: null };
      }),
    getEntry: (key) => get().entriesByKey[key],
    pruneEntries: (visibleKeys, now) => {
      visibleEntryKeys.clear();
      for (const key of visibleKeys) {
        visibleEntryKeys.add(key);
      }

      set((state) => {
        const touchedEntriesByKey = { ...state.entriesByKey };
        for (const key of visibleEntryKeys) {
          const entry = touchedEntriesByKey[key];
          if (entry) {
            touchedEntriesByKey[key] = { ...entry, lastAccessedAt: now };
          }
        }

        return {
          entriesByKey: withEntryRetention(
            touchedEntriesByKey,
            now,
            state.activeTarget?.key,
          ),
        };
      });
    },
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
          entriesByKey: withEntryRetention(
            {
              ...state.entriesByKey,
              [target.key]: {
                guilds: [],
                lastAccessedAt: Date.now(),
                requestKey: target.requestKey,
                status: "error",
              },
            },
            Date.now(),
            state.activeTarget?.key,
          ),
        };
      }),
    setIdle: (target) =>
      set((state) => ({
        entriesByKey: withEntryRetention(
          {
            ...state.entriesByKey,
            [target.key]: {
              guilds: [],
              lastAccessedAt: Date.now(),
              requestKey: target.requestKey,
              status: "idle",
            },
          },
          Date.now(),
          state.activeTarget?.key,
        ),
      })),
    setLoading: (target) =>
      set((state) => {
        if (!canApplyTargetEntry(state.entriesByKey[target.key], target)) {
          return state;
        }

        return {
          entriesByKey: withEntryRetention(
            {
              ...state.entriesByKey,
              [target.key]: {
                guilds: state.entriesByKey[target.key]?.guilds ?? [],
                lastAccessedAt: Date.now(),
                requestKey: target.requestKey,
                status: "loading",
              },
            },
            Date.now(),
            state.activeTarget?.key,
          ),
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
          entriesByKey: withEntryRetention(
            {
              ...state.entriesByKey,
              [target.key]: {
                fetchedAt,
                guilds,
                lastAccessedAt: Date.now(),
                requestKey: target.requestKey,
                status: "success",
              },
            },
            Date.now(),
            state.activeTarget?.key,
          ),
        };
      }),
    setUnavailable: (key) =>
      set((state) => {
        if (state.entriesByKey[key]?.status === "unavailable") {
          return state;
        }

        return {
          entriesByKey: withEntryRetention(
            {
              ...state.entriesByKey,
              [key]: {
                guilds: [],
                lastAccessedAt: Date.now(),
                status: "unavailable",
              },
            },
            Date.now(),
            state.activeTarget?.key,
          ),
        };
      }),
  }));
