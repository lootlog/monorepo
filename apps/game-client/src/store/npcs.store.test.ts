import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNpcsStore } from "./npcs.store";

const createNpc = (id: number, nick: string) => ({
  id,
  templateId: id,
  x: 1,
  y: 2,
  icon: "npc.gif",
  name: nick,
  profession: "m",
  type: 3,
  weight: 90,
  level: 240,
});

describe("useNpcsStore", () => {
  beforeEach(() => {
    useNpcsStore.getState().clearNpcs();
  });

  it("keeps immutable npc snapshots while applying map changes", () => {
    const firstNpc = createNpc(501, "Pierwszy");
    useNpcsStore.getState().replaceNpcs([firstNpc, createNpc(502, "Drugi")]);

    firstNpc.name = "Zmieniony poza storem";
    expect(useNpcsStore.getState().getNpc(501)?.name).toBe("Pierwszy");

    useNpcsStore.getState().applyNpcBatch({
      removeIds: [502],
      upserts: [{ ...createNpc(501, "Zaktualizowany"), x: 8 }],
    });

    expect(useNpcsStore.getState().getNpc(501)).toEqual(
      expect.objectContaining({ name: "Zaktualizowany", x: 8 }),
    );
    expect(useNpcsStore.getState().getNpc(502)).toBeUndefined();
    expect(Object.isFrozen(useNpcsStore.getState().getNpc(501))).toBe(true);
    expect(useNpcsStore.getState().status).toBe("ready");
  });

  it("does not publish semantically unchanged batches", () => {
    const npc = createNpc(501, "Pierwszy");
    useNpcsStore.getState().replaceNpcs([npc]);
    const initialState = useNpcsStore.getState();
    const listener = vi.fn();
    const unsubscribe = useNpcsStore.subscribe(listener);

    useNpcsStore.getState().applyNpcBatch({
      removeIds: [999],
      upserts: [{ ...npc }],
    });

    expect(useNpcsStore.getState()).toBe(initialState);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("represents an empty but ready map without polling", () => {
    useNpcsStore.getState().replaceNpcs([], true);

    expect(useNpcsStore.getState()).toMatchObject({
      mapEpoch: 1,
      npcsById: {},
      status: "ready",
    });
  });
});
