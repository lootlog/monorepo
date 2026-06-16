import type { Api } from "@lootlog/margonem/api";
import type { Engine } from "@lootlog/margonem/engine";
import type { Game } from "@lootlog/margonem/game";
import type { GameHero } from "@lootlog/margonem/hero";
import type { GameMap } from "@lootlog/margonem/map";

declare global {
  interface Window {
    API: Api;
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
