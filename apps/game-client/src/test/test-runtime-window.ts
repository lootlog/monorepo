export type TestRuntimeWindow = Window & {
  API?: {
    addCallbackToEvent: (...args: never[]) => unknown;
    removeCallbackFromEvent: (...args: never[]) => unknown;
  };
  Engine?: {
    [key: string]: unknown;
    communication?: Record<string, unknown>;
    hero?: { d: { id: number } };
  };
  _g?: (command: string, ...args: unknown[]) => unknown;
  getCookie?: (name: string) => string | null | undefined;
  message?: (text: string) => void;
};

export const testRuntimeWindow: TestRuntimeWindow =
  window as unknown as TestRuntimeWindow;

const DEFAULT_TEST_HERO: RuntimeHero = {
  accountId: "202",
  characterId: "101",
  currentHp: 100,
  icon: "hero.gif",
  level: 230,
  maxHp: 100,
  name: "Tester",
  profession: "w",
  x: 1,
  y: 2,
};

export const setTestRuntimeGame = (
  game: Partial<Omit<RuntimeGameSnapshot, "hero">> & {
    hero?: Partial<RuntimeHero>;
  } = {},
): void => {
  useGameStore.getState().replaceGame({
    hero: { ...DEFAULT_TEST_HERO, ...game.hero },
    interface: game.interface ?? "ni",
    map: game.map ?? { id: 42, name: "Ithan", visibility: 30 },
    world: game.world ?? "pandora",
  });
};
import { useGameStore } from "@/store/game.store";
import type {
  RuntimeGameSnapshot,
  RuntimeHero,
} from "@/lib/margonem-runtime/runtime.types";
