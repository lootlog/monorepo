import type { Engine } from "./margonem/engine";
import type { Game } from "./margonem/game";
import type { GameHero } from "./margonem/hero";
import type { GameMap } from "./margonem/map";

declare global {
  interface Window {
    Engine: Engine;
    __llOthersDebug?: {
      getState: () => {
        count: number;
        playersByRuntimeId: Record<
          string,
          {
            runtimeId: string;
            characterId: string;
            accountId: string;
          }
        >;
        players: Array<{
          runtimeId: string;
          characterId: string;
          accountId: string;
        }>;
        debugLogs: Array<{
          id: number;
          timestamp: string;
          source: "store" | "event" | "runtime";
          type: string;
          beforeCount: number;
          afterCount: number;
          details?: Record<string, unknown>;
        }>;
      };
      getLogs: () => Array<{
        id: number;
        timestamp: string;
        source: "store" | "event" | "runtime";
        type: string;
        beforeCount: number;
        afterCount: number;
        details?: Record<string, unknown>;
      }>;
      clearLogs: () => void;
      dump: () => void;
    };
    _g: Function;
    g: Game;
    hero: GameHero;
    map: GameMap;
    getCookie: (name: string) => string | null;
    message: (text: string) => void;
    getZoomFactor: () => number;
  }
}
