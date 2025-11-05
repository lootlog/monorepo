import type { Engine } from "./margonem/engine";
import type { Game } from "./margonem/game";
import type { GameHero } from "./margonem/hero";
import type { GameMap } from "./margonem/map";

declare global {
  interface Window {
    Engine: Engine;
    _g: Function;
    g: Game;
    hero: GameHero;
    map: GameMap;
    getCookie: (name: string) => string | null;
    message: (text: string) => void;
  }
}
