import { createContext } from "react";

/**
 * The settings tabs' shared page viewport, for lists under the tabs that
 * virtualize their tiles. `null` until it mounts, and on phones, where the
 * document scrolls instead.
 */
export const SettingsScrollerContext = createContext<HTMLDivElement | null>(
  null,
);
