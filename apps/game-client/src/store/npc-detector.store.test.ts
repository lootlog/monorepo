import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "./npc-detector.store";

const createNpc = (id: number, nick = `npc-${id}`): GameNpcWithLocation =>
  ({
    icon: `${id}.gif`,
    id,
    location: "Test map",
    lvl: 300,
    nick,
    notificationSent: false,
    prof: "w",
    tpl: id,
    type: 3,
    wt: 80,
    x: 1,
    y: 1,
  }) as GameNpcWithLocation;

describe("useNpcDetectorStore", () => {
  beforeEach(() => {
    useNpcDetectorStore.setState({
      activeDetectionAnimations: {},
      latestDetectionAnimationCycle: 0,
      npcs: [],
    });
  });

  it("does not publish when removed ids are absent", () => {
    const npc = createNpc(1);
    useNpcDetectorStore.getState().addNpc(npc);
    const npcs = useNpcDetectorStore.getState().npcs;
    const publish = vi.fn();
    const unsubscribe = useNpcDetectorStore.subscribe(publish);

    useNpcDetectorStore.getState().removeNpc([2, 3]);

    expect(useNpcDetectorStore.getState().npcs).toBe(npcs);
    expect(publish).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("preserves batch order and merges existing npcs without highlighting", () => {
    const first = createNpc(1, "first");
    const second = createNpc(2, "second");
    useNpcDetectorStore.getState().addNpc([first, second]);

    useNpcDetectorStore
      .getState()
      .addNpc([createNpc(3, "third"), createNpc(1, "updated")]);

    expect(useNpcDetectorStore.getState().npcs.map((npc) => npc.id)).toEqual([
      3, 2, 1,
    ]);
    expect(useNpcDetectorStore.getState().npcs.at(-1)?.nick).toBe("updated");
  });

  it("moves every highlighted npc to the front using last incoming order", () => {
    useNpcDetectorStore
      .getState()
      .addNpc([createNpc(1), createNpc(2), createNpc(3)]);

    useNpcDetectorStore
      .getState()
      .addNpc([createNpc(1, "first update"), createNpc(2, "second update")], {
        highlightOnExisting: true,
      });

    expect(useNpcDetectorStore.getState().npcs.map((npc) => npc.id)).toEqual([
      2, 1, 3,
    ]);
    expect(useNpcDetectorStore.getState().activeDetectionAnimations).toEqual({
      1: 1,
      2: 1,
    });
  });

  it("publishes one structural update for a batch of npc state changes", () => {
    useNpcDetectorStore
      .getState()
      .addNpc([createNpc(1), createNpc(2), createNpc(3)]);
    const publish = vi.fn();
    const unsubscribe = useNpcDetectorStore.subscribe(publish);

    useNpcDetectorStore.getState().setNpcStates([
      { npcId: 1, npc: { notificationSent: true } },
      { npcId: 2, npc: { notificationSent: true } },
    ]);

    expect(publish).toHaveBeenCalledOnce();
    expect(
      useNpcDetectorStore.getState().npcs.filter((npc) => npc.notificationSent),
    ).toHaveLength(2);
    unsubscribe();
  });
});
