import type { RuntimeGameSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "./game.store";

const createGame = (overrides?: {
  hero?: Partial<RuntimeGameSnapshot["hero"]>;
}): RuntimeGameSnapshot =>
  Object.freeze({
    hero: Object.freeze({
      accountId: "1",
      characterId: "2",
      currentHp: 100,
      icon: "hero.gif",
      level: 300,
      maxHp: 100,
      name: "Hero",
      profession: "w",
      x: 10,
      y: 20,
      ...overrides?.hero,
    }),
    interface: "ni",
    map: Object.freeze({ id: 1, name: "Map", visibility: 30 }),
    world: "tempest",
  });

describe("useGameStore", () => {
  beforeEach(() => {
    useGameStore.getState().clearGame();
  });

  it("does not publish a semantically equal snapshot", () => {
    useGameStore.getState().replaceGame(createGame());
    const game = useGameStore.getState().game;
    const revision = useGameStore.getState().revision;
    const publish = vi.fn();
    const unsubscribe = useGameStore.subscribe(publish);

    useGameStore.getState().replaceGame(createGame());

    expect(useGameStore.getState().game).toBe(game);
    expect(useGameStore.getState().revision).toBe(revision);
    expect(publish).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("keeps publishing coordinate changes for reconnect snapshots", () => {
    useGameStore.getState().replaceGame(createGame());
    const publish = vi.fn();
    const unsubscribe = useGameStore.subscribe(publish);

    useGameStore.getState().replaceGame(createGame({ hero: { x: 11, y: 21 } }));

    expect(useGameStore.getState().game?.hero).toEqual(
      expect.objectContaining({ x: 11, y: 21 }),
    );
    expect(publish).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("preserves the game reference while publishing a semantic map epoch", () => {
    useGameStore.getState().replaceGame(createGame());
    const game = useGameStore.getState().game;
    const mapEpoch = useGameStore.getState().mapEpoch;
    const publish = vi.fn();
    const unsubscribe = useGameStore.subscribe(publish);

    useGameStore.getState().replaceGame(createGame(), true);

    expect(useGameStore.getState().game).toBe(game);
    expect(useGameStore.getState().mapEpoch).toBe(mapEpoch + 1);
    expect(publish).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
