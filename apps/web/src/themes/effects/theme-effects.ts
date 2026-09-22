/*
 * Theme effects are a per-device preference: how much decorative motion a theme
 * may run, and whether ambient motion pauses while the player works in another
 * window. They live in localStorage, not on the account, because they answer a
 * question about this machine (a second monitor next to Margonem), not about
 * the player. Themes read the result from two attributes on <html>:
 *
 *   data-theme-effects="full" | "subtle" | "off"
 *   data-theme-effects-idle   present while ambient motion should stand still
 */

import { z } from "zod";

export const THEME_EFFECTS_LEVELS = ["full", "subtle", "off"] as const;

export type ThemeEffectsLevel = (typeof THEME_EFFECTS_LEVELS)[number];

export interface ThemeEffectsSettings {
  level: ThemeEffectsLevel;
  /** Pause ambient motion while the window has no focus, even if it stays visible. */
  pauseWhenUnfocused: boolean;
}

export const DEFAULT_THEME_EFFECTS: ThemeEffectsSettings = {
  level: "full",
  pauseWhenUnfocused: true,
};

export const THEME_EFFECTS_STORAGE_KEY = "lootlog-theme-effects";

const themeEffectsSchema = z
  .object({
    level: z.enum(THEME_EFFECTS_LEVELS).catch(DEFAULT_THEME_EFFECTS.level),
    pauseWhenUnfocused: z
      .boolean()
      .catch(DEFAULT_THEME_EFFECTS.pauseWhenUnfocused),
  })
  .catch(DEFAULT_THEME_EFFECTS);

export const parseThemeEffectsSettings = (
  raw: string | null | undefined,
): ThemeEffectsSettings => {
  if (!raw) return DEFAULT_THEME_EFFECTS;

  try {
    return themeEffectsSchema.parse(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME_EFFECTS;
  }
};

export const readThemeEffectsSettings = (
  storage: Pick<Storage, "getItem"> = localStorage,
): ThemeEffectsSettings =>
  parseThemeEffectsSettings(storage.getItem(THEME_EFFECTS_STORAGE_KEY));

export const writeThemeEffectsSettings = (
  settings: ThemeEffectsSettings,
  storage: Pick<Storage, "setItem"> = localStorage,
) => {
  storage.setItem(THEME_EFFECTS_STORAGE_KEY, JSON.stringify(settings));
};

/** Ambient motion is idle when the player is elsewhere: the tab is hidden, or the
 *  window lost focus and the player asked for that to count. */
export const isThemeEffectsIdle = ({
  settings,
  hidden,
  focused,
}: {
  settings: ThemeEffectsSettings;
  hidden: boolean;
  focused: boolean;
}) => hidden || (settings.pauseWhenUnfocused && !focused);

export const applyThemeEffectsToRoot = ({
  root,
  settings,
  idle,
}: {
  root: HTMLElement;
  settings: ThemeEffectsSettings;
  idle: boolean;
}) => {
  root.dataset.themeEffects = settings.level;

  if (idle) {
    root.dataset.themeEffectsIdle = "";
  } else {
    delete root.dataset.themeEffectsIdle;
  }
};

type Listener = () => void;

const listeners = new Set<Listener>();

let current: ThemeEffectsSettings | null = null;

const getSnapshot = (): ThemeEffectsSettings => {
  current ??= readThemeEffectsSettings();

  return current;
};

export const themeEffectsStore = {
  subscribe: (listener: Listener) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
  getSnapshot,
  set: (patch: Partial<ThemeEffectsSettings>) => {
    current = { ...getSnapshot(), ...patch };
    writeThemeEffectsSettings(current);
    listeners.forEach((listener) => listener());
  },
  /** Tests reset the module between cases. */
  reset: () => {
    current = null;
  },
};
