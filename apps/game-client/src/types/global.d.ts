import { Engine } from "./margonem/engine";
import { Game } from "./margonem/game";

declare global {
  interface Window {
    Engine: Engine;
    _g: Function;
    g: Game;
    hero: HeroD;
    map: Map;
    ogSuccessData: ((event: string) => void) | null;
    successData: (event: string) => void;
  }
}
