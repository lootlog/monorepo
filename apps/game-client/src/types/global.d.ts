import { Engine } from "./margonem/engine";
import { Game } from "./margonem/game";
import { GameHero } from "./margonem/hero";
import { GameMap } from "./margonem/map";

declare global {
  interface Window {
    Engine: Engine;
    _g: Function;
    g: Game;
    hero: GameHero;
    map: GameMap;
    ogSuccessData: ((event: string) => void) | null;
    successData: (event: string) => void;
    getCookie: (name: string) => string | null;
    message: (text: string) => void;
  }
}
