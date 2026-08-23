import type { GameEvent } from "@lootlog/margonem/game-events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFriendsStore } from "@/store/friends.store";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { useOthersStore } from "@/store/others.store";
import { usePartyStore } from "@/store/party.store";
import type { MargonemRuntimeAdapter } from "./runtime-adapter";
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
  world: "pandora",
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
    getAllNpcs: vi.fn(() => [npc]),
    getAllOtherHandles: vi.fn(() => ({})),
    getAllOthers: vi.fn(() => ({})),
    getGameSnapshot: vi.fn(() => game),
    getNpc: vi.fn(),
    getOther: vi.fn(),
    getOtherHandle: vi.fn(),
    getParty: vi.fn(() => []),
    getStateSnapshot: vi.fn(() => ({
      friends: [],
      game,
      npcs: [npc],
      others: {},
      party: [],
    })),
    interface: "ni" as const,
    isReady: vi.fn(() => true),
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
        h: { warrior_stats: { hp: 40, maxhp: 120 }, x: 8, y: 9 },
      } as unknown as GameEvent),
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

  it("publishes identity only for CREATE and ignores movement packets", () => {
    const adapter = createAdapter();
    const handle = { d: { account: 22, id: 11 } };
    adapter.getOtherHandle.mockReturnValue(handle as never);
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
