import type { Engine, Game, GameHero, GameMap } from "@lootlog/margonem-types";

declare global {
  interface Window {
    Engine: Engine;
    _g: Function;
    g: Game;
    hero: GameHero;
    map: GameMap;
    getCookie: (name: string) => string | null;
    message: (text: string) => void;
    getZoomFactor: () => number;
  }
}
