import { Game } from "@/lib/game";
import { gameEventsManager } from "@/lib/game-events-manager";
import type { GameClientSetupAddon, GameClientAddonSetupContext } from "@/addons/types";

export const defineAddon = <T extends GameClientSetupAddon>(addon: T): T => addon;

export const createAddonSetupContext = (
  addonId: string,
): GameClientAddonSetupContext => {
  return {
    Game,
    Engine: window.Engine,
    window,
    gameEventsManager,
    log: (...messages: unknown[]) => {
      console.log(`[addon:${addonId}]`, ...messages);
    },
  };
};

export const addonSdk = {
  defineAddon,
  Game,
  gameEventsManager,
};
