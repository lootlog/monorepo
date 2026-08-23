import type {
  RuntimeGameSnapshot,
  RuntimeStatus,
} from "@/lib/margonem-runtime/runtime.types";
import { create } from "zustand";

type GameState = {
  game: RuntimeGameSnapshot | null;
  mapEpoch: number;
  revision: number;
  status: RuntimeStatus;
  clearGame: (mapChanged?: boolean) => void;
  replaceGame: (game: RuntimeGameSnapshot, mapChanged?: boolean) => void;
};

function areClansEqual(
  current: RuntimeGameSnapshot["hero"]["clan"],
  incoming: RuntimeGameSnapshot["hero"]["clan"],
): boolean {
  if (current === incoming) return true;
  if (!current || !incoming) return false;
  return (
    current.id === incoming.id &&
    current.name === incoming.name &&
    current.rank === incoming.rank
  );
}

function areGameSnapshotsEqual(
  current: RuntimeGameSnapshot,
  incoming: RuntimeGameSnapshot,
): boolean {
  return (
    current.interface === incoming.interface &&
    current.world === incoming.world &&
    current.map.id === incoming.map.id &&
    current.map.name === incoming.map.name &&
    current.map.visibility === incoming.map.visibility &&
    current.hero.accountId === incoming.hero.accountId &&
    current.hero.characterId === incoming.hero.characterId &&
    current.hero.currentHp === incoming.hero.currentHp &&
    current.hero.icon === incoming.hero.icon &&
    current.hero.level === incoming.hero.level &&
    current.hero.maxHp === incoming.hero.maxHp &&
    current.hero.name === incoming.hero.name &&
    current.hero.profession === incoming.hero.profession &&
    current.hero.x === incoming.hero.x &&
    current.hero.y === incoming.hero.y &&
    areClansEqual(current.hero.clan, incoming.hero.clan)
  );
}

function freezeGameSnapshot(game: RuntimeGameSnapshot): RuntimeGameSnapshot {
  let clan: RuntimeGameSnapshot["hero"]["clan"];
  if (game.hero.clan) {
    clan = Object.freeze({ ...game.hero.clan });
  }

  return Object.freeze({
    hero: Object.freeze({ ...game.hero, clan }),
    interface: game.interface,
    map: Object.freeze({ ...game.map }),
    world: game.world,
  });
}

export const useGameStore = create<GameState>()((set) => ({
  game: null,
  mapEpoch: 0,
  revision: 0,
  status: "uninitialized",
  clearGame: (mapChanged = false) =>
    set((state) => ({
      game: null,
      mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
      revision: state.revision + 1,
      status: "uninitialized",
    })),
  replaceGame: (game, mapChanged = false) =>
    set((state) => {
      const gameUnchanged = Boolean(
        state.game && areGameSnapshotsEqual(state.game, game),
      );
      if (!mapChanged && state.status === "ready" && gameUnchanged) {
        return state;
      }

      let storedGame = state.game;
      if (!gameUnchanged || !storedGame) {
        storedGame = freezeGameSnapshot(game);
      }

      return {
        game: storedGame,
        mapEpoch: mapChanged ? state.mapEpoch + 1 : state.mapEpoch,
        revision: state.revision + 1,
        status: "ready",
      };
    }),
}));
