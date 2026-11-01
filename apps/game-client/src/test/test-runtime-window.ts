type TestRuntimeEngine = {
  [key: string]: unknown;
  communication?: Record<string, unknown>;
  hero?: { d: { id: number } };
};

export type TestRuntimeWindow = Window & {
  API?: {
    addCallbackToEvent: (...args: never[]) => void;
    removeCallbackFromEvent: (...args: never[]) => void;
  };
  Engine?: TestRuntimeEngine;
  _g?: (command: string, ...args: unknown[]) => unknown;
  getCookie?: (name: string) => string | null | undefined;
  message?: (text: string) => void;
};

export const testRuntimeWindow: TestRuntimeWindow = window;

const DEFAULT_TEST_HERO: RuntimeHero = {
  accountId: "202",
  characterId: "101",
  currentHp: 100,
  icon: "hero.gif",
  level: 230,
  maxHp: 100,
  name: "Tester",
  profession: "w",
  stasis: false,
  x: 1,
  y: 2,
};

export const setTestRuntimeGame = (
  game: Partial<Omit<RuntimeGameSnapshot, "hero">> & {
    hero?: Partial<RuntimeHero>;
  } = {},
): void => {
  useGameStore.getState().replaceGame({
    gameVersion: game.gameVersion === undefined ? "pl" : game.gameVersion,
    hero: { ...DEFAULT_TEST_HERO, ...game.hero },
    interface: game.interface ?? "ni",
    map: game.map ?? { id: 42, name: "Ithan", visibility: 30 },
    world: game.world ?? "luvia",
  });
};

import { onTestFinished } from "vitest";
import { useGameStore } from "@/store/game.store";
import type {
  RuntimeGameSnapshot,
  RuntimeHero,
} from "@/lib/margonem-runtime/runtime.types";

/**
 * Records each game message as the player reads it: message() decodes HTML
 * entities and renders the result as HTML.
 */
export const captureRuntimeMessages = (): string[] => {
  const messages: string[] = [];

  testRuntimeWindow.message = (text) => {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = text;
    const rendered = document.createElement("div");
    rendered.innerHTML = decoder.value;
    messages.push(rendered.textContent ?? "");
  };

  onTestFinished(() => {
    delete testRuntimeWindow.message;
  });

  return messages;
};
