import {
  getCharacterFilterKey,
  migrateCharacterFilters,
} from "@/lib/character-filter-scope";
import {
  decodeTimerSettings,
  type UpdateTimerSettingsPayload,
  type TimersFilters,
  type TimersDisplayConfig,
  type TimersGeneralConfig as SharedTimersGeneralConfig,
  type CustomTimerColor,
  type CustomTimerList,
} from "@lootlog/schema/timer-settings";
import { NpcType } from "@/api/npcs.api";
import { omit } from "es-toolkit";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createChangedOnlyStorage } from "./changed-only-storage";
import { storageKey } from "@/lib/storage-key";
import {
  syncCustomList,
  syncGuildTimerList,
  syncTimerSettings,
} from "./timer-settings-sync";

export const TIMERS_STORAGE_KEY = storageKey("ll-timers-state");

const DEFAULT_REMOVE_TIMER_AFTER_MS = 30000;

type TimersGeneralConfig = SharedTimersGeneralConfig & { compactView: boolean };

const DEFAULT_GENERAL_CONFIG = {
  removeTimerAfterMs: DEFAULT_REMOVE_TIMER_AFTER_MS,
  timersGrouping: false,
  timersUnderBag: false,
  countdownMode: "max",
  compactView: false,
} satisfies TimersGeneralConfig;

type HiddenTimers = Record<string, string[]>;

type PinnedTimers = Record<string, string[]>;

interface TimersState {
  updatedAt?: number;
  hiddenTimers: HiddenTimers;
  pinnedTimers: PinnedTimers;
  alwaysVisibleExpiredTimers: Record<string, string[]>;
  timersColors: Record<string, string | undefined>;
  customColors: Record<string, CustomTimerColor>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >;
  hiddenDefaultColors: string[];
  customLists: Record<string, CustomTimerList>;
  timersFilters: Record<string, TimersFilters>;
  legacyTimersFilters: Record<string, TimersFilters>;
  initializeCharacterFilters: (scopeKey: string) => void;
  timerFiltersEnabled: boolean;
  colorFiltersEnabled: boolean;
  timerFiltersSearchText: string;
  timersSortOrder: "asc" | "desc";
  generalConfig: TimersGeneralConfig;
  setGeneralConfig: (config: TimersGeneralConfig) => void;
  displayConfig: TimersDisplayConfig;
  setDisplayConfig: (config: TimersDisplayConfig) => void;
  setTimersFilters: (
    scopeKey: string,
    settingsKey: string,
    filters: TimersFilters,
  ) => void;
  setTimersSortOrder: (order: "asc" | "desc") => void;
  toggleTimerFiltersEnabled: () => void;
  toggleColorFiltersEnabled: () => void;
  setTimerFiltersSearchText: (text: string) => void;
  hideTimer: (guildId: string, timerId: string) => void;
  revealTimer: (guildId: string, timerId: string) => void;
  setExpiredTimerAlwaysVisible: (
    world: string,
    timerKey: string,
    visible: boolean,
  ) => void;
  pinTimer: (guildId: string, timerId: string) => void;
  unpinTimer: (guildId: string, timerId: string) => void;
  setTimerColor: (npcName: string, color?: string) => void;
  /** Adds the colour or replaces the one with its id. */
  setCustomColor: (color: CustomTimerColor) => void;
  deleteCustomColor: (id: string) => void;
  setDefaultColorName: (colorId: string, name: string) => void;
  updateDefaultColor: (
    colorId: string,
    borderColor: string,
    backgroundColor: string,
  ) => void;
  resetDefaultColor: (colorId: string) => void;
  resetAllDefaultColors: () => void;
  deleteDefaultColor: (colorId: string) => void;
  restoreDefaultColor: (colorId: string) => void;
  /** Creates a list and returns its id. */
  addCustomList: (name: string, npcNames?: string[]) => string;
  renameCustomList: (id: string, name: string) => void;
  deleteCustomList: (id: string) => void;
  setTimerListMembership: (
    listId: string,
    npcName: string,
    member: boolean,
  ) => void;
}

const DEFAULT_SELECTED_NPC_TYPES = [
  NpcType.ELITE3,
  NpcType.ELITE2,
  NpcType.HERO,
  NpcType.EVENT_HERO,
  NpcType.TITAN,
  NpcType.HERO_TRACKER,
];

type StoredTimersFilters = Record<string, TimersFilters>;

const withNpcType = (
  filters: StoredTimersFilters | undefined,
  npcType: NpcType,
  shouldAdd: (filter: TimersFilters) => boolean,
): StoredTimersFilters | undefined =>
  filters &&
  Object.fromEntries(
    Object.entries(filters).map(([key, filter]) => [
      key,
      !filter.selectedNpcTypes.includes(npcType) && shouldAdd(filter)
        ? { ...filter, selectedNpcTypes: [...filter.selectedNpcTypes, npcType] }
        : filter,
    ]),
  );

// Each type joins stored filters once, in the version that introduced it; a
// later choice to hide it stays. Event hero timers were hero timers before
// version 8, so a filter that showed heroes keeps showing them; Hero Tracker
// timers are new in version 9, so no stored filter could hide them.
const withNewNpcTypes = (
  filters: StoredTimersFilters | undefined,
  version: number,
) =>
  withNpcType(
    version < 8
      ? withNpcType(filters, NpcType.EVENT_HERO, (filter) =>
          filter.selectedNpcTypes.includes(NpcType.HERO),
        )
      : filters,
    NpcType.HERO_TRACKER,
    () => true,
  );

/** Timer colours left without the given colour; its timers fall back to the default. */
const withoutTimerColor = (
  timersColors: TimersState["timersColors"],
  colorId: string,
) =>
  Object.fromEntries(
    Object.entries(timersColors).map(([npcName, value]) => [
      npcName,
      value === colorId ? undefined : value,
    ]),
  );

/** Drops a default colour's custom look and name. */
const withoutDefaultColorChanges = (
  state: Pick<TimersState, "overriddenDefaultColors" | "defaultColorNames">,
  colorId: string,
) => ({
  overriddenDefaultColors: omit(state.overriddenDefaultColors, [colorId]),
  defaultColorNames: omit(state.defaultColorNames, [colorId]),
});

export const DEFAULT_TIMERS_FILTERS: TimersFilters = {
  minLvl: 0,
  maxLvl: 300,
  selectedNpcTypes: DEFAULT_SELECTED_NPC_TYPES,
  selectedColors: [],
  selectedLists: [],
};

const updateTimestamp =
  (set: (partial: (state: TimersState) => Partial<TimersState>) => void) =>
  (partial: (state: TimersState) => Partial<TimersState>) => {
    set((state) => ({ ...partial(state), updatedAt: Date.now() }));
  };

export const useTimersStore = create<TimersState>()(
  persist(
    (set, get) => {
      const setWithTimestamp = updateTimestamp(set);

      const setGlobalSettings = (
        payload: UpdateTimerSettingsPayload & Partial<TimersState>,
      ) => {
        const previous = get();
        setWithTimestamp(() => payload);
        syncTimerSettings(payload, previous);
      };

      const updateGuildTimerList = (
        field: "hiddenTimers" | "pinnedTimers",
        guildId: string,
        timerId: string,
        selected: boolean,
      ) => {
        const current = get()[field][guildId] ?? [];

        const next = selected
          ? [...new Set([...current, timerId])]
          : current.filter((id) => id !== timerId);

        setWithTimestamp(() => ({
          [field]: { ...get()[field], [guildId]: next },
        }));
        syncGuildTimerList(guildId, field, next);
      };

      const setCustomList = (id: string, list: CustomTimerList | undefined) => {
        const customLists = { ...get().customLists };

        if (list) customLists[id] = list;
        else delete customLists[id];

        setWithTimestamp(() => ({ customLists }));
        syncCustomList(id, list);
      };

      return {
        hiddenTimers: {},
        pinnedTimers: {},
        alwaysVisibleExpiredTimers: {},
        timersColors: {},
        customColors: {},
        defaultColorNames: {},
        overriddenDefaultColors: {},
        hiddenDefaultColors: [],
        customLists: {},
        generalConfig: DEFAULT_GENERAL_CONFIG,
        setGeneralConfig: (config: TimersGeneralConfig) => {
          setGlobalSettings({ generalConfig: config });
        },
        displayConfig: {
          legacyAppearance: false,
          showType: true,
          showLevel: false,
          fontSize: 11,
          minColumnWidth: 140,
          singleTimerDisplayMode: "row",
        },
        setDisplayConfig: (config: TimersDisplayConfig) => {
          setGlobalSettings({ displayConfig: config });
        },
        timerFiltersEnabled: false,
        colorFiltersEnabled: false,
        timerFiltersSearchText: "",
        timersSortOrder: "asc",
        timersFilters: {},
        legacyTimersFilters: {},
        initializeCharacterFilters: (scopeKey) => {
          const { legacyTimersFilters, timersFilters } = get();

          if (Object.keys(legacyTimersFilters).length === 0) return;
          set({
            timersFilters: {
              ...migrateCharacterFilters(legacyTimersFilters, scopeKey),
              ...timersFilters,
            },
            legacyTimersFilters: {},
          });
        },
        setTimersFilters: (scopeKey, settingsKey, filters) => {
          setWithTimestamp((state) => ({
            timersFilters: {
              ...migrateCharacterFilters(state.legacyTimersFilters, scopeKey),
              ...state.timersFilters,
              [getCharacterFilterKey(scopeKey, settingsKey)]: filters,
            },
            legacyTimersFilters: {},
          }));
        },
        setTimersSortOrder: (order: "asc" | "desc") => {
          setGlobalSettings({ timersSortOrder: order });
        },
        toggleTimerFiltersEnabled: () => {
          setGlobalSettings({
            timerFiltersEnabled: !get().timerFiltersEnabled,
          });
        },
        toggleColorFiltersEnabled: () => {
          setGlobalSettings({
            colorFiltersEnabled: !get().colorFiltersEnabled,
          });
        },
        setTimerFiltersSearchText: (text: string) => {
          set({ timerFiltersSearchText: text });
        },
        hideTimer: (guildId: string, timerId: string) =>
          updateGuildTimerList("hiddenTimers", guildId, timerId, true),
        revealTimer: (guildId: string, timerId: string) =>
          updateGuildTimerList("hiddenTimers", guildId, timerId, false),
        setExpiredTimerAlwaysVisible: (world, timerKey, visible) => {
          const { alwaysVisibleExpiredTimers } = get();
          const timerKeys = alwaysVisibleExpiredTimers[world] ?? [];

          setGlobalSettings({
            alwaysVisibleExpiredTimers: {
              ...alwaysVisibleExpiredTimers,
              [world]: visible
                ? [...new Set([...timerKeys, timerKey])]
                : timerKeys.filter((key) => key !== timerKey),
            },
          });
        },
        pinTimer: (guildId: string, timerId: string) =>
          updateGuildTimerList("pinnedTimers", guildId, timerId, true),
        unpinTimer: (guildId: string, timerId: string) =>
          updateGuildTimerList("pinnedTimers", guildId, timerId, false),
        setTimerColor: (npcName: string, color?: string) => {
          const updatedTimersColors = {
            ...get().timersColors,
            [npcName]: color,
          };

          setGlobalSettings({ timersColors: updatedTimersColors });
        },
        setCustomColor: (color: CustomTimerColor) => {
          setGlobalSettings({
            customColors: { ...get().customColors, [color.id]: color },
          });
        },
        deleteCustomColor: (id: string) => {
          setGlobalSettings({
            customColors: omit(get().customColors, [id]),
            timersColors: withoutTimerColor(get().timersColors, id),
          });
        },
        setDefaultColorName: (colorId: string, name: string) => {
          const updatedDefaultColorNames = {
            ...get().defaultColorNames,
            [colorId]: name,
          };

          setGlobalSettings({ defaultColorNames: updatedDefaultColorNames });
        },
        updateDefaultColor: (
          colorId: string,
          borderColor: string,
          backgroundColor: string,
        ) => {
          const updatedOverriddenDefaultColors = {
            ...get().overriddenDefaultColors,
            [colorId]: { borderColor, backgroundColor },
          };

          setGlobalSettings({
            overriddenDefaultColors: updatedOverriddenDefaultColors,
          });
        },
        resetDefaultColor: (colorId: string) => {
          setGlobalSettings(withoutDefaultColorChanges(get(), colorId));
        },
        resetAllDefaultColors: () => {
          setGlobalSettings({
            overriddenDefaultColors: {},
            defaultColorNames: {},
          });
        },
        deleteDefaultColor: (colorId: string) => {
          const state = get();

          setGlobalSettings({
            hiddenDefaultColors: [...state.hiddenDefaultColors, colorId],
            timersColors: withoutTimerColor(state.timersColors, colorId),
          });
        },
        restoreDefaultColor: (colorId: string) => {
          const state = get();

          setGlobalSettings({
            hiddenDefaultColors: state.hiddenDefaultColors.filter(
              (id) => id !== colorId,
            ),
            ...withoutDefaultColorChanges(state, colorId),
          });
        },
        addCustomList: (name: string, npcNames: string[] = []) => {
          const id = crypto.randomUUID();
          setCustomList(id, { id, name, npcNames });

          return id;
        },
        renameCustomList: (id: string, name: string) => {
          const list = get().customLists[id];

          if (list) setCustomList(id, { ...list, name });
        },
        deleteCustomList: (id: string) => setCustomList(id, undefined),
        setTimerListMembership: (
          listId: string,
          npcName: string,
          member: boolean,
        ) => {
          const list = get().customLists[listId];

          if (!list || list.npcNames.includes(npcName) === member) return;

          setCustomList(listId, {
            ...list,
            npcNames: member
              ? [...list.npcNames, npcName]
              : list.npcNames.filter((name) => name !== npcName),
          });
        },
      };
    },
    {
      name: TIMERS_STORAGE_KEY,
      partialize: (state) => ({
        updatedAt: state.updatedAt,
        hiddenTimers: state.hiddenTimers,
        pinnedTimers: state.pinnedTimers,
        alwaysVisibleExpiredTimers: state.alwaysVisibleExpiredTimers,
        timersColors: state.timersColors,
        customColors: state.customColors,
        defaultColorNames: state.defaultColorNames,
        overriddenDefaultColors: state.overriddenDefaultColors,
        hiddenDefaultColors: state.hiddenDefaultColors,
        customLists: state.customLists,
        timerFiltersEnabled: state.timerFiltersEnabled,
        colorFiltersEnabled: state.colorFiltersEnabled,
        timersSortOrder: state.timersSortOrder,
        timersFilters: state.timersFilters,
        legacyTimersFilters: state.legacyTimersFilters,
        generalConfig: state.generalConfig,
        displayConfig: state.displayConfig,
      }),
      storage: createChangedOnlyStorage(createJSONStorage(() => localStorage)),
      merge: (persistedState, currentState) => {
        const persisted = decodeTimerSettings(persistedState);

        return {
          ...currentState,
          updatedAt: persisted.updatedAt ?? currentState.updatedAt,
          generalConfig: {
            ...DEFAULT_GENERAL_CONFIG,
            ...persisted.generalConfig,
          },
          displayConfig: {
            ...currentState.displayConfig,
            ...persisted.displayConfig,
            legacyAppearance:
              persisted.displayConfig?.legacyAppearance ?? false,
          },
          hiddenTimers: persisted.hiddenTimers ?? currentState.hiddenTimers,
          pinnedTimers: persisted.pinnedTimers ?? currentState.pinnedTimers,
          alwaysVisibleExpiredTimers:
            persisted.alwaysVisibleExpiredTimers ?? {},
          timersColors: persisted.timersColors ?? currentState.timersColors,
          customColors: persisted.customColors ?? currentState.customColors,
          defaultColorNames:
            persisted.defaultColorNames ?? currentState.defaultColorNames,
          overriddenDefaultColors:
            persisted.overriddenDefaultColors ??
            currentState.overriddenDefaultColors,
          hiddenDefaultColors:
            persisted.hiddenDefaultColors ?? currentState.hiddenDefaultColors,
          customLists: persisted.customLists ?? currentState.customLists,
          timersFilters: persisted.timersFilters ?? currentState.timersFilters,
          legacyTimersFilters:
            persisted.legacyTimersFilters ?? currentState.legacyTimersFilters,
          timerFiltersEnabled:
            persisted.timerFiltersEnabled ?? currentState.timerFiltersEnabled,
          colorFiltersEnabled:
            persisted.colorFiltersEnabled ?? currentState.colorFiltersEnabled,
          timersSortOrder:
            persisted.timersSortOrder ?? currentState.timersSortOrder,
        };
      },
      version: 9,
      migrate: (persistedState, version) => {
        const persisted = decodeTimerSettings(persistedState);

        if (version < 7) {
          return {
            ...persisted,
            timersFilters: {},
            legacyTimersFilters:
              withNewNpcTypes(persisted.timersFilters, version) ?? {},
          };
        }

        return {
          ...persisted,
          timersFilters: withNewNpcTypes(persisted.timersFilters, version),
          legacyTimersFilters: withNewNpcTypes(
            persisted.legacyTimersFilters,
            version,
          ),
        };
      },
    },
  ),
);
