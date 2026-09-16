import type { GameEvent } from "@lootlog/margonem/game-events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFriendsStore } from "@/store/friends.store";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { useOthersStore } from "@/store/others.store";
import { usePartyStore } from "@/store/party.store";
import {
  NiRuntimeAdapter,
  SiRuntimeAdapter,
  type MargonemRuntimeAdapter,
} from "./runtime-adapter";
import { parseRuntimeFacts } from "./runtime-event-parser";
import { runtimeOtherHandles } from "./runtime-other-handles";
import { RuntimeStateProjection } from "./runtime-state-projection";
import type {
  RuntimeEventEnvelope,
  RuntimeGameSnapshot,
} from "./runtime.types";

const game = Object.freeze({
  hero: Object.freeze({
    accountId: "2",
    characterId: "1",
    currentHp: 50,
    icon: "hero.gif",
    level: 300,
    maxHp: 100,
    name: "Hero",
    profession: "w",
    x: 1,
    y: 2,
  }),
  interface: "ni",
  map: Object.freeze({ id: 10, name: "Map", visibility: 30 }),
  world: "luvia",
}) satisfies RuntimeGameSnapshot;

const npc = Object.freeze({
  icon: "npc.gif",
  id: 501,
  level: 300,
  name: "Npc",
  profession: "m",
  templateId: 701,
  type: 2,
  weight: 85,
  x: 1,
  y: 2,
});

function createAdapter() {
  return {
    getAllNpcs: vi.fn<MargonemRuntimeAdapter["getAllNpcs"]>(() => [npc]),
    getAllOtherHandles: vi.fn<MargonemRuntimeAdapter["getAllOtherHandles"]>(
      () => ({}),
    ),
    getAllOthers: vi.fn<MargonemRuntimeAdapter["getAllOthers"]>(() => ({})),
    getGameSnapshot: vi.fn<MargonemRuntimeAdapter["getGameSnapshot"]>(
      () => game,
    ),
    getNpc: vi.fn<MargonemRuntimeAdapter["getNpc"]>(),
    getOther: vi.fn<MargonemRuntimeAdapter["getOther"]>(),
    getOtherHandle: vi.fn<MargonemRuntimeAdapter["getOtherHandle"]>(),
    getParty: vi.fn<MargonemRuntimeAdapter["getParty"]>(() => []),
    getStateSnapshot: vi.fn<MargonemRuntimeAdapter["getStateSnapshot"]>(() => ({
      friends: [],
      game,
      npcs: [npc],
      others: {},
      party: [],
    })),
    interface: "ni" as const,
    isReady: vi.fn<() => boolean>(() => true),
  } satisfies MargonemRuntimeAdapter;
}

function createEnvelope(event: GameEvent): RuntimeEventEnvelope {
  return Object.freeze({
    facts: parseRuntimeFacts(event),
    ingress: Object.freeze({
      game: null,
      intent: null,
      npcsById: Object.freeze({}),
      othersById: Object.freeze({}),
    }),
    observedAt: 1,
    raw: event,
    sequence: 1,
  });
}

describe("RuntimeStateProjection", () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    useGameStore.getState().clearGame();
    useNpcsStore.getState().clearNpcs();
    useOthersStore.getState().clearOthers();
    usePartyStore.getState().clearParty();
    useFriendsStore.getState().clearFriends();
    runtimeOtherHandles.clear();
  });

  it("reads Margonem once during bootstrap and patches hero and map from events", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    expect(projection.bootstrap()).toBe(true);

    projection.apply(
      createEnvelope({
        h: {
          warrior_stats: {
            hp: 40,
            maxhp: 120,
            st: 0,
            ag: 0,
            it: 0,
            sa: 0,
            crit: 0,
            ac: 0,
            resfire: 0,
            resfrost: 0,
            reslight: 0,
            act: 0,
            attack: { physicalMainHand: { min: 0, max: 0, average: 0 } },
            evade: [],
            heal: 0,
            acdmg: 0,
            slow: 0,
            fatigs: {
              energy: { power: 0, chance: 0 },
              mana: { power: 0, chance: 0 },
            },
            blok: 0,
            critval: 0,
            energy: 0,
            lowevade: 0,
            energygain: 0,
            wound0: 0,
            wound1: 0,
            legbon_verycrit: 0,
            legbon_holytouch: [],
            legbon_curse: 0,
            legbon_glare: 0,
            legbon_lastheal: [],
            legbon_critred: 0,
          },
          x: 8,
          y: 9,
        },
      } satisfies GameEvent),
    );
    projection.apply(
      createEnvelope({
        town: {
          bg: "",
          file: "",
          id: 11,
          mainid: 11,
          mode: 0,
          name: "New map",
          pvp: 0,
          visibility: 25,
          water: "",
          x: 0,
          y: 0,
        },
      }),
    );

    expect(useGameStore.getState().game).toEqual(
      expect.objectContaining({
        hero: expect.objectContaining({
          currentHp: 40,
          maxHp: 120,
          x: 8,
          y: 9,
        }),
        map: { id: 11, name: "New map", visibility: 25 },
      }),
    );
    expect(adapter.getStateSnapshot).toHaveBeenCalledOnce();
    expect(adapter.getGameSnapshot).not.toHaveBeenCalled();
    expect(adapter.getAllNpcs).not.toHaveBeenCalled();
    expect(adapter.getAllOthers).not.toHaveBeenCalled();
  });

  it.each([{ visibility: 12 }, { id: 10 }, { name: "" }])(
    "preserves the current map and NPCs after a partial town update %j",
    (town) => {
      const adapter = createAdapter();
      const projection = new RuntimeStateProjection({ adapter });
      projection.bootstrap();
      const epoch = useGameStore.getState().mapEpoch;
      projection.apply(createEnvelope({ town }));
      expect(useGameStore.getState().game?.map).toEqual({
        ...game.map,
        visibility: town.visibility ?? game.map.visibility,
      });
      expect(useNpcsStore.getState().getNpc(501)).toEqual(npc);
      expect(useGameStore.getState().mapEpoch).toBe(epoch);
    },
  );

  it("recovers a new map name from applied native state without reusing the old map name", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();
    adapter.getGameSnapshot.mockReturnValue({
      ...game,
      map: { id: 11, name: "Native map", visibility: 15 },
    });
    projection.apply(createEnvelope({ town: { id: 11 } }));
    expect(useGameStore.getState().game?.map).toEqual({
      id: 11,
      name: "Native map",
      visibility: 15,
    });
    expect(useNpcsStore.getState().getNpc(501)).toBeUndefined();
  });

  it("does not borrow a location from a later native map when processing queued events", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();
    adapter.getGameSnapshot.mockReturnValue({
      ...game,
      map: { id: 12, name: "Future map", visibility: 15 },
    });
    projection.apply(createEnvelope({ town: { id: 11 } }));
    expect(useGameStore.getState().game?.map.name).toBe("");
    expect(useGameStore.getState().game?.map.id).toBe(11);
  });

  it("repairs a missing location before capturing a loot ingress snapshot", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();
    useGameStore
      .getState()
      .replaceGame({ ...game, map: { ...game.map, name: "" } });

    const envelope = projection.captureIngress(
      createEnvelope({ item: {}, loot: { source: "fight", states: {} } }),
    );

    expect(envelope.ingress.game?.map.name).toBe("Map");
    expect(useGameStore.getState().game?.map.name).toBe("Map");
  });

  it("announces recovered map metadata before the ordinary event without changing the native packet", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();
    adapter.getGameSnapshot.mockImplementation(() => {
      throw new Error("Map initializing");
    });
    projection.apply(createEnvelope({ town: { id: 11 } }));
    const epoch = useGameStore.getState().mapEpoch;
    adapter.getGameSnapshot.mockReturnValue({
      ...game,
      map: { id: 11, name: "Recovered map", visibility: 30 },
    });
    const event = { h: { stasis: 0 } } satisfies GameEvent;
    const envelope = projection.captureIngress(createEnvelope(event));
    projection.apply(envelope);
    expect(envelope.raw).toBe(event);
    expect(event).not.toHaveProperty("town");
    expect(envelope.facts.map((fact) => fact.kind)).toEqual(["map", "afk"]);
    expect(envelope.facts[0]?.event.town).toMatchObject({
      id: 11,
      name: "Recovered map",
    });
    expect(useGameStore.getState().mapEpoch).toBe(epoch);
    expect(
      projection
        .captureIngress(createEnvelope(event))
        .facts.map((fact) => fact.kind),
    ).toEqual(["afk"]);
  });

  it.each(["ni", "si"] as const)(
    "recovers the location through the real %s adapter",
    (runtimeInterface) => {
      const nativeHero = {
        account: 2,
        id: 1,
        img: "hero.gif",
        lvl: 300,
        nick: "Hero",
        prof: "w",
        x: 1,
        y: 2,
      };

      const nativeMap = { id: 10, name: "Native location", visibility: 30 };
      const worldConfig = { getWorldName: () => "luvia" };
      vi.stubGlobal("Engine", {
        hero: { d: nativeHero },
        map: { d: nativeMap },
        worldConfig,
      });
      vi.stubGlobal("hero", nativeHero);
      vi.stubGlobal("map", nativeMap);
      vi.stubGlobal("g", { worldConfig });

      const nativeAdapter =
        runtimeInterface === "ni"
          ? new NiRuntimeAdapter()
          : new SiRuntimeAdapter();

      const adapter = createAdapter();
      adapter.getGameSnapshot.mockImplementation(() =>
        nativeAdapter.getGameSnapshot(),
      );
      const projection = new RuntimeStateProjection({ adapter });
      projection.bootstrap();
      useGameStore.getState().replaceGame({
        ...game,
        interface: runtimeInterface,
        map: { ...game.map, name: "" },
      });

      const envelope = projection.captureIngress(
        createEnvelope({ item: {}, loot: { source: "fight", states: {} } }),
      );

      expect(envelope.ingress.game?.map.name).toBe("Native location");
    },
  );

  it("builds NPCs from templates and icons carried by the event", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();

    projection.apply(
      createEnvelope({
        icons: [{ icon: "new-npc.gif", id: 91 }],
        npc_tpls: [
          {
            id: 701,
            level: 301,
            nick: "New npc",
            prof: "m",
            resp_rand: 15,
            type: 2,
            warrior_type: 95,
          },
        ],
        npcs: [{ icon: { id: 91 }, id: 502, tpl: 701, x: 4, y: 5 }],
      }),
    );

    expect(useNpcsStore.getState().getNpc(502)).toEqual({
      actions: undefined,
      groupId: undefined,
      icon: "new-npc.gif",
      id: 502,
      level: 301,
      name: "New npc",
      profession: "m",
      respawnRandomness: 15,
      templateId: 701,
      type: 2,
      weight: 95,
      x: 4,
      y: 5,
    });
    expect(adapter.getNpc).not.toHaveBeenCalled();
  });

  it("uses the hero level for NPC templates with a zero elastic factor", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();

    projection.apply(
      createEnvelope({
        icons: [{ icon: "elastic.gif", id: 92 }],
        npc_tpls: [
          {
            elasticLevelFactor: 0,
            resp_rand: 0,
            id: 702,
            level: 250,
            nick: "Elastic npc",
            prof: "m",
            type: 2,
            warrior_type: 95,
          },
        ],
        npcs: [{ icon: { id: 92 }, id: 503, tpl: 702, x: 4, y: 5 }],
      } satisfies GameEvent),
    );

    expect(useNpcsStore.getState().getNpc(503)?.level).toBe(300);
  });

  it("publishes identity only for CREATE and ignores movement packets", () => {
    const adapter = createAdapter();

    const handle = {
      d: {
        account: 22,
        id: "11",
        icon: "other.gif",
        nick: "Other",
        prof: "w",
        lvl: 50,
      },
    };

    adapter.getOtherHandle.mockReturnValue(handle);
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();

    projection.apply(
      createEnvelope({
        other: {
          11: {
            account: 22,
            action: "CREATE",
            attr: 0,
            dir: 0,
            icon: "other.gif",
            is_blessed: 0,
            lvl: 300,
            nick: "Other",
            oplvl: 0,
            prof: "w",
            relation: 0,
            rights: 0,
            stasis: 0,
            stasis_incoming_seconds: 0,
            x: 1,
            y: 2,
          },
        },
      }),
    );
    const othersById = useOthersStore.getState().othersById;

    projection.apply(createEnvelope({ other: { 11: { dir: 1, x: 2, y: 3 } } }));

    expect(useOthersStore.getState().othersById).toBe(othersById);
    expect(useOthersStore.getState().getOther("11")).toEqual({
      accountId: "22",
      characterId: "11",
      icon: "other.gif",
      level: 300,
      name: "Other",
      profession: "w",
    });
    expect(adapter.getOther).not.toHaveBeenCalled();
    expect(adapter.getOtherHandle).toHaveBeenCalledOnce();
  });

  it("replaces membership on map changes, applies deletions and rebuilds after cleanup", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();
    useOthersStore.getState().replaceOthers({
      "11": {
        accountId: "22",
        characterId: "11",
        name: "Previous map",
        icon: "a.gif",
        profession: "w",
        level: 30,
      },
    });
    projection.apply(
      createEnvelope({
        town: {
          id: 12,
          mainid: 12,
          bg: "",
          file: "",
          mode: 0,
          name: "Empty map",
          pvp: 0,
          visibility: 30,
          water: "",
          x: 0,
          y: 0,
        },
      }),
    );
    expect(useOthersStore.getState().othersById).toEqual({});
    expect(useOthersStore.getState().status).toBe("ready");
    expect(useOthersStore.getState().mapEpoch).toBe(
      useGameStore.getState().mapEpoch,
    );
    useOthersStore.getState().replaceOthers({
      "33": {
        accountId: "44",
        characterId: "33",
        name: "Departing",
        icon: "b.gif",
        profession: "m",
        level: 30,
      },
    });
    projection.apply(createEnvelope({ other: { "33": { del: 1 } } }));
    expect(useOthersStore.getState().othersById).toEqual({});
    projection.cleanup();
    expect(useOthersStore.getState().status).toBe("uninitialized");
    expect(projection.bootstrap()).toBe(true);
    expect(useOthersStore.getState().status).toBe("ready");
    expect(useOthersStore.getState().othersById).toEqual({});
  });

  it("captures pre-event state from Lootlog stores before applying deletion", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();

    const envelope = createEnvelope({
      h: { stasis: 1 },
      npcs_del: [{ id: 501, respBaseSeconds: 120 }],
    });

    const captured = projection.captureIngress(envelope);
    projection.apply(captured);

    expect(captured.ingress.game).toBe(useGameStore.getState().game);
    expect(captured.ingress.npcsById[501]).toEqual(npc);
    expect(useNpcsStore.getState().getNpc(501)).toBeUndefined();
    expect(adapter.getGameSnapshot).not.toHaveBeenCalled();
    expect(adapter.getNpc).not.toHaveBeenCalled();
  });

  it("captures the dialog NPC before applying the same packet", () => {
    const adapter = createAdapter();
    const projection = new RuntimeStateProjection({ adapter });
    projection.bootstrap();
    const envelope = createEnvelope({ d: ["dialog", "npc", "501"] });

    const captured = projection.captureIngress(envelope);

    expect(captured.ingress.npcsById[501]).toEqual(npc);
    expect(adapter.getNpc).not.toHaveBeenCalled();
  });

  it("clears partial state when the initial snapshot cannot be completed", () => {
    const adapter = createAdapter();
    adapter.getAllOtherHandles.mockImplementation(() => {
      throw new Error("handles unavailable");
    });
    const projection = new RuntimeStateProjection({ adapter });

    expect(projection.bootstrap()).toBe(false);
    expect(useGameStore.getState().status).toBe("uninitialized");
    expect(useNpcsStore.getState().status).toBe("uninitialized");
    expect(useOthersStore.getState().status).toBe("uninitialized");
    expect(runtimeOtherHandles.getAll()).toEqual({});
  });
});
