import type { GameEvent } from "@lootlog/margonem/game-events";
import { describe, expect, it } from "vitest";
import { MAX_BATTLE_CAPTURE_EVENTS, useBattleStore } from "./battle.store";

describe("battle capture accumulator", () => {
  it("accumulates in O(1) without publishing every event", () => {
    useBattleStore.getState().clearEvents();
    let publications = 0;
    const unsubscribe = useBattleStore.subscribe(() => {
      publications += 1;
    });
    const event = { f: { m: ["turn"] } } as GameEvent;

    for (let index = 0; index < MAX_BATTLE_CAPTURE_EVENTS; index += 1) {
      useBattleStore.getState().addEvent(event);
    }

    expect(useBattleStore.getState().events).toHaveLength(
      MAX_BATTLE_CAPTURE_EVENTS,
    );
    expect(publications).toBe(0);
    unsubscribe();
  });

  it("discards the whole capture after the event limit overflows", () => {
    useBattleStore.getState().clearEvents();
    const event = { f: { m: ["turn"] } } as GameEvent;

    for (let index = 0; index <= MAX_BATTLE_CAPTURE_EVENTS; index += 1) {
      useBattleStore.getState().addEvent(event);
    }

    expect(useBattleStore.getState().getCaptureSnapshot()).toEqual(
      expect.objectContaining({
        events: [],
        overflowed: true,
      }),
    );
  });

  it("discards the whole capture after the retained byte budget overflows", () => {
    useBattleStore.getState().clearEvents();

    useBattleStore.getState().addEvent({
      f: { m: ["x".repeat(2_700_000)] },
    } as GameEvent);

    expect(useBattleStore.getState().getCaptureSnapshot()).toEqual(
      expect.objectContaining({
        events: [],
        overflowed: true,
      }),
    );
  });

  it("resets overflow metadata when a new battle starts", () => {
    useBattleStore.getState().clearEvents();
    useBattleStore.getState().addEvent({
      f: { m: ["x".repeat(2_700_000)] },
    } as GameEvent);

    useBattleStore.getState().clearEvents();

    expect(useBattleStore.getState().getCaptureSnapshot()).toEqual({
      bytes: 0,
      events: [],
      overflowed: false,
      turns: [],
    });
  });

  it("returns an immutable capture snapshot while later packets arrive", () => {
    useBattleStore.getState().clearEvents();
    const firstEvent = { f: { m: ["first"] } } as GameEvent;
    const laterEvent = { f: { m: ["later"] } } as GameEvent;
    useBattleStore.getState().addEvent(firstEvent);

    const snapshot = useBattleStore.getState().getCaptureSnapshot();
    useBattleStore.getState().addEvent(laterEvent);

    expect(snapshot.events).toEqual([firstEvent]);
    expect(snapshot.turns).toEqual(["first"]);
    expect(useBattleStore.getState().getCaptureSnapshot().events).toEqual([
      firstEvent,
      laterEvent,
    ]);
  });

  it("publishes a multi-field battle transition exactly once", () => {
    let publications = 0;
    const unsubscribe = useBattleStore.subscribe(() => {
      publications += 1;
    });

    useBattleStore.getState().applyBatch({
      battleState: "in-battle",
      battleWarriors: {
        "1": { id: 1, name: "warrior" } as never,
      },
      lastBattleHash: "battle",
      lastKillHash: "kill",
    });

    unsubscribe();
    expect(publications).toBe(1);
    expect(useBattleStore.getState()).toMatchObject({
      battleState: "in-battle",
      lastBattleHash: "battle",
      lastKillHash: "kill",
    });
  });
});
