import {
  DEFAULT_LOOTLOG_GLOW_COLOR,
  DEFAULT_NON_LOOTLOG_GLOW_COLOR,
} from "@/addons/extensions/online-players-glow/online-players-glow.constants";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const ONLINE_PLAYERS_GLOW_SETTINGS_STORAGE_KEY =
  "ll:addons:online-players-glow:settings";

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const normalizeHexColor = (value: string, fallback: string): string => {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (!HEX_COLOR_REGEX.test(normalized)) {
    return fallback;
  }

  return normalized.toLowerCase();
};

export type OnlinePlayersGlowSettingsSnapshot = {
  lootlogGlowEnabled: boolean;
  lootlogGlowColor: string;
  nonLootlogGlowEnabled: boolean;
  nonLootlogGlowColor: string;
};

type OnlinePlayersGlowSettingsStore = OnlinePlayersGlowSettingsSnapshot & {
  setLootlogGlowEnabled: (value: boolean) => void;
  setLootlogGlowColor: (value: string) => void;
  setNonLootlogGlowEnabled: (value: boolean) => void;
  setNonLootlogGlowColor: (value: string) => void;
};

const DEFAULT_STATE: OnlinePlayersGlowSettingsSnapshot = {
  lootlogGlowEnabled: true,
  lootlogGlowColor: DEFAULT_LOOTLOG_GLOW_COLOR,
  nonLootlogGlowEnabled: false,
  nonLootlogGlowColor: DEFAULT_NON_LOOTLOG_GLOW_COLOR,
};

export const useOnlinePlayersGlowStore =
  create<OnlinePlayersGlowSettingsStore>()(
    persist(
      (set) => ({
        ...DEFAULT_STATE,
        setLootlogGlowEnabled: (value) =>
          set({
            lootlogGlowEnabled: value,
          }),
        setLootlogGlowColor: (value) =>
          set({
            lootlogGlowColor: normalizeHexColor(
              value,
              DEFAULT_LOOTLOG_GLOW_COLOR,
            ),
          }),
        setNonLootlogGlowEnabled: (value) =>
          set({
            nonLootlogGlowEnabled: value,
          }),
        setNonLootlogGlowColor: (value) =>
          set({
            nonLootlogGlowColor: normalizeHexColor(
              value,
              DEFAULT_NON_LOOTLOG_GLOW_COLOR,
            ),
          }),
      }),
      {
        name: ONLINE_PLAYERS_GLOW_SETTINGS_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          lootlogGlowEnabled: state.lootlogGlowEnabled,
          lootlogGlowColor: state.lootlogGlowColor,
          nonLootlogGlowEnabled: state.nonLootlogGlowEnabled,
          nonLootlogGlowColor: state.nonLootlogGlowColor,
        }),
        merge: (persistedState, currentState) => {
          const persisted =
            (persistedState as Partial<OnlinePlayersGlowSettingsSnapshot>) ??
            {};

          return {
            ...currentState,
            lootlogGlowEnabled:
              typeof persisted.lootlogGlowEnabled === "boolean"
                ? persisted.lootlogGlowEnabled
                : DEFAULT_STATE.lootlogGlowEnabled,
            lootlogGlowColor: normalizeHexColor(
              String(persisted.lootlogGlowColor ?? DEFAULT_LOOTLOG_GLOW_COLOR),
              DEFAULT_LOOTLOG_GLOW_COLOR,
            ),
            nonLootlogGlowEnabled:
              typeof persisted.nonLootlogGlowEnabled === "boolean"
                ? persisted.nonLootlogGlowEnabled
                : DEFAULT_STATE.nonLootlogGlowEnabled,
            nonLootlogGlowColor: normalizeHexColor(
              String(
                persisted.nonLootlogGlowColor ?? DEFAULT_NON_LOOTLOG_GLOW_COLOR,
              ),
              DEFAULT_NON_LOOTLOG_GLOW_COLOR,
            ),
          };
        },
        version: 1,
      },
    ),
  );

export const getOnlinePlayersGlowSettingsSnapshot =
  (): OnlinePlayersGlowSettingsSnapshot => {
    const state = useOnlinePlayersGlowStore.getState();

    return {
      lootlogGlowEnabled: state.lootlogGlowEnabled,
      lootlogGlowColor: state.lootlogGlowColor,
      nonLootlogGlowEnabled: state.nonLootlogGlowEnabled,
      nonLootlogGlowColor: state.nonLootlogGlowColor,
    };
  };
