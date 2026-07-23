import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRuntimeAdapter,
  getMargonemInterface,
  isMargonemRuntimeReady,
  NiRuntimeAdapter,
  normalizeNpc,
  SiRuntimeAdapter,
} from "./runtime-adapter";

const gameNpc = {
  icon: "npc.gif",
  id: 501,
  tpl: 700,
  x: 12,
  y: 8,
  nick: "Example",
  prof: "w",
  type: 2,
  wt: 85,
  lvl: 300,
  resp_rand: 0.2,
};

const hero = {
  account: 101,
  clan: {
    id: 303,
    name: "Lootlog",
    rank: 4,
  },
  id: 202,
  img: "hero.gif",
  lvl: 300,
  nick: "Hero",
  prof: "w",
  warrior_stats: { hp: 40, maxhp: 50 },
  x: 12,
  y: 8,
};

const map = { id: 7, name: "Test map", visibility: 21 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runtime adapter normalization", () => {
  it("creates a frozen Lootlog NPC model without exposing the Margonem object", () => {
    const mutableGameNpc = { ...gameNpc };

    const npc = normalizeNpc(mutableGameNpc);
    mutableGameNpc.nick = "Changed by Margonem";

    expect(npc).toEqual({
      actions: undefined,
      groupId: undefined,
      icon: "npc.gif",
      id: 501,
      level: 300,
      name: "Example",
      profession: "w",
      respawnRandomness: 0.2,
      templateId: 700,
      type: 2,
      weight: 85,
      x: 12,
      y: 8,
    });
    expect(Object.isFrozen(npc)).toBe(true);
  });
});

describe("NI runtime adapter", () => {
  it("normalizes a complete engine snapshot and targeted lookups", () => {
    const rawOther = {
      d: {
        account: 303,
        icon: "other.gif",
        id: 404,
        lvl: 250,
        nick: "Other",
        prof: "m",
      },
    };
    const engine = {
      hero: { d: hero },
      interface: { alreadyInitialised: true },
      map: { d: map },
      npcs: {
        check: () => ({ [gameNpc.id]: { d: gameNpc } }),
        getById: (id: number) =>
          id === gameNpc.id ? { d: gameNpc } : undefined,
      },
      others: {
        check: () => ({ "404": rawOther }),
        getById: (id: number) => (id === 404 ? rawOther : undefined),
      },
      party: {
        getMembers: () =>
          new Map([
            [
              404,
              {
                accountId: 303,
                hp: [20, 30],
                icon: "other.gif",
                id: 404,
                leader: true,
                nick: "Other",
                profession: "m",
              },
            ],
          ]),
      },
      worldConfig: { getWorldName: () => "world" },
    };
    vi.stubGlobal("Engine", engine);
    const adapter = new NiRuntimeAdapter();

    const snapshot = adapter.getStateSnapshot();

    expect(snapshot.game).toEqual({
      hero: {
        accountId: "101",
        characterId: "202",
        clan: {
          id: 303,
          name: "Lootlog",
          rank: 4,
        },
        currentHp: 40,
        icon: "hero.gif",
        level: 300,
        maxHp: 50,
        name: "Hero",
        profession: "w",
        x: 12,
        y: 8,
      },
      interface: "ni",
      map,
      world: "world",
    });
    expect(snapshot.npcs).toEqual([expect.objectContaining({ id: 501 })]);
    expect(snapshot.others).toEqual({
      "404": {
        accountId: "303",
        characterId: "404",
        icon: "other.gif",
        level: 250,
        name: "Other",
        profession: "m",
      },
    });
    expect(snapshot.party).toEqual([
      {
        accountId: "303",
        characterId: "404",
        currentHp: 20,
        icon: "other.gif",
        isLeader: true,
        maxHp: 30,
        name: "Other",
        profession: "m",
      },
    ]);
    expect(adapter.getNpc(501)?.id).toBe(501);
    expect(adapter.getNpc(999)).toBeUndefined();
    expect(adapter.getOther("404")?.characterId).toBe("404");
    expect(adapter.getOther("999")).toBeUndefined();
    expect(adapter.getOtherHandle("404")).toBe(rawOther);
    expect(adapter.isReady()).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("supports the readiness fallback and an unavailable party", () => {
    vi.stubGlobal("Engine", {
      interface: { getAlreadyInitialised: () => true },
    });
    const adapter = new NiRuntimeAdapter();

    expect(adapter.getParty()).toEqual([]);
    expect(adapter.isReady()).toBe(true);
  });
});

describe("SI runtime adapter", () => {
  it("normalizes legacy globals and defaults missing collections to empty", () => {
    vi.stubGlobal("Engine", undefined);
    vi.stubGlobal("hero", hero);
    vi.stubGlobal("map", map);
    vi.stubGlobal("g", {
      init: 5,
      npc: { [gameNpc.id]: gameNpc },
      other: {
        "404": {
          account: 303,
          icon: "other.gif",
          id: 404,
          lvl: 250,
          nick: "Other",
          prof: "m",
        },
      },
      worldConfig: { getWorldName: () => "legacy-world" },
    });
    const adapter = new SiRuntimeAdapter();

    expect(adapter.getGameSnapshot().world).toBe("legacy-world");
    expect(adapter.getAllNpcs()).toEqual([
      expect.objectContaining({ id: gameNpc.id }),
    ]);
    expect(adapter.getNpc(gameNpc.id)?.id).toBe(gameNpc.id);
    expect(adapter.getAllOthers()["404"]?.accountId).toBe("303");
    expect(adapter.getOther("404")?.characterId).toBe("404");
    expect(adapter.getParty()).toEqual([]);
    expect(adapter.isReady()).toBe(true);

    vi.stubGlobal("g", {
      init: 0,
      worldConfig: { getWorldName: () => "legacy-world" },
    });
    expect(adapter.getAllNpcs()).toEqual([]);
    expect(adapter.getAllOthers()).toEqual({});
    expect(adapter.getNpc(gameNpc.id)).toBeUndefined();
    expect(adapter.getOther("404")).toBeUndefined();
    expect(adapter.isReady()).toBe(false);
  });
});

describe("runtime adapter selection", () => {
  it("selects NI when Engine exists and SI otherwise", () => {
    vi.stubGlobal("Engine", {});
    expect(createRuntimeAdapter()).toBeInstanceOf(NiRuntimeAdapter);
    expect(getMargonemInterface()).toBe("ni");

    vi.stubGlobal("Engine", undefined);
    expect(createRuntimeAdapter()).toBeInstanceOf(SiRuntimeAdapter);
    expect(getMargonemInterface()).toBe("si");
  });

  it("reports an unavailable runtime as not ready", () => {
    vi.stubGlobal("Engine", undefined);
    vi.stubGlobal("g", undefined);

    expect(isMargonemRuntimeReady()).toBe(false);
  });
});
