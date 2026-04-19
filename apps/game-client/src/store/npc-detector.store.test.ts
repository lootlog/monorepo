import { beforeEach, describe, expect, it } from "vitest";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "./npc-detector.store";

const createNpc = (
  overrides?: Partial<GameNpcWithLocation>,
): GameNpcWithLocation => ({
  id: 1,
  nick: "Npc",
  x: 10,
  y: 20,
  tpl: 100,
  icon: "npc.gif",
  prof: "m",
  wt: 80,
  lvl: 200,
  type: 3,
  location: "Ithan",
  notificationSent: false,
  ...overrides,
});

describe("useNpcDetectorStore", () => {
  beforeEach(() => {
    useNpcDetectorStore.setState({
      npcs: [],
      activeDetectionAnimations: {},
      latestDetectionAnimationCycle: 0,
    });
  });

  it("adds new npcs at the front of the list", () => {
    const firstNpc = createNpc({ id: 1, nick: "First" });
    const secondNpc = createNpc({ id: 2, nick: "Second" });

    useNpcDetectorStore.getState().addNpc(firstNpc);
    useNpcDetectorStore.getState().addNpc(secondNpc);

    expect(useNpcDetectorStore.getState().npcs).toEqual([secondNpc, firstNpc]);
  });

  it("merges an existing npc without reordering when highlight is disabled", () => {
    const firstNpc = createNpc({ id: 1, nick: "First" });
    const secondNpc = createNpc({ id: 2, nick: "Second", x: 30 });

    useNpcDetectorStore.setState({
      npcs: [firstNpc, secondNpc],
      activeDetectionAnimations: {},
      latestDetectionAnimationCycle: 0,
    });

    useNpcDetectorStore.getState().addNpc({
      id: 2,
      x: 45,
      location: "Verbin",
    } as GameNpcWithLocation);

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      firstNpc,
      expect.objectContaining({
        id: 2,
        nick: "Second",
        x: 45,
        location: "Verbin",
      }),
    ]);
  });

  it("moves an existing npc to the front and starts a new highlight cycle", () => {
    const firstNpc = createNpc({ id: 1, nick: "First" });
    const secondNpc = createNpc({ id: 2, nick: "Second", x: 30 });

    useNpcDetectorStore.setState({
      npcs: [firstNpc, secondNpc],
      activeDetectionAnimations: { 1: 1 },
      latestDetectionAnimationCycle: 1,
    });

    useNpcDetectorStore.getState().addNpc(
      {
        id: 2,
        x: 55,
        location: "Nithal",
      } as GameNpcWithLocation,
      { highlightOnExisting: true },
    );

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      expect.objectContaining({
        id: 2,
        nick: "Second",
        x: 55,
        location: "Nithal",
      }),
      firstNpc,
    ]);
    expect(useNpcDetectorStore.getState().activeDetectionAnimations).toEqual({
      2: 2,
    });
    expect(useNpcDetectorStore.getState().latestDetectionAnimationCycle).toBe(
      2,
    );
  });

  it("removes multiple npcs and clears their active animations", () => {
    const firstNpc = createNpc({ id: 1 });
    const secondNpc = createNpc({ id: 2 });
    const thirdNpc = createNpc({ id: 3 });

    useNpcDetectorStore.setState({
      npcs: [firstNpc, secondNpc, thirdNpc],
      activeDetectionAnimations: { 1: 1, 2: 2, 3: 3 },
      latestDetectionAnimationCycle: 3,
    });

    useNpcDetectorStore.getState().removeNpc([1, 3]);

    expect(useNpcDetectorStore.getState().npcs).toEqual([secondNpc]);
    expect(useNpcDetectorStore.getState().activeDetectionAnimations).toEqual({
      2: 2,
    });
  });

  it("clears a detection animation only when the cycle matches", () => {
    useNpcDetectorStore.setState({
      npcs: [createNpc({ id: 1 })],
      activeDetectionAnimations: { 1: 3 },
      latestDetectionAnimationCycle: 3,
    });

    useNpcDetectorStore.getState().clearDetectionAnimation(1, 2);

    expect(useNpcDetectorStore.getState().activeDetectionAnimations).toEqual({
      1: 3,
    });

    useNpcDetectorStore.getState().clearDetectionAnimation(1, 3);

    expect(useNpcDetectorStore.getState().activeDetectionAnimations).toEqual(
      {},
    );
  });

  it("clears all npcs and animations", () => {
    useNpcDetectorStore.setState({
      npcs: [createNpc({ id: 1 }), createNpc({ id: 2 })],
      activeDetectionAnimations: { 1: 1, 2: 2 },
      latestDetectionAnimationCycle: 2,
    });

    useNpcDetectorStore.getState().clearNpcs();

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
    expect(useNpcDetectorStore.getState().activeDetectionAnimations).toEqual(
      {},
    );
  });
});
