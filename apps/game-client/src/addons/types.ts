import type { ComponentType } from "react";
import type { Game } from "@/lib/game";
import type { gameEventsManager } from "@/lib/game-events-manager";

export type GameClientAddonMountProps = {
  enabled: boolean;
  gameInitialized: boolean;
};

export type GameClientAddonSetupContext = {
  Game: typeof Game;
  Engine: Window["Engine"];
  window: Window;
  gameEventsManager: typeof gameEventsManager;
  log: (...messages: unknown[]) => void;
};

export type GameClientAddonBase = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  order?: number;
  defaultEnabled?: boolean;
};

export type GameClientComponentAddon = GameClientAddonBase & {
  Mount: ComponentType<GameClientAddonMountProps>;
};

export type GameClientSetupAddon = GameClientAddonBase & {
  setup: (context: GameClientAddonSetupContext) => void | (() => void);
};

export type GameClientAddon = GameClientComponentAddon | GameClientSetupAddon;
