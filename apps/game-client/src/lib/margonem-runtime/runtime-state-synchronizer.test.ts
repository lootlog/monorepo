import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { useOthersStore } from "@/store/others.store";
import { usePartyStore } from "@/store/party.store";
import { useFriendsStore } from "@/store/friends.store";
import type { MargonemRuntimeAdapter } from "./runtime-adapter";
import type { RuntimeEventEnvelope } from "./runtime.types";
import { RuntimeStateSynchronizer } from "./runtime-state-synchronizer";

const game = {
  hero: {
    accountId: "2",
    characterId: "1",
    currentHp: 50,
    icon: "hero.gif",
    level: 300,
    maxHp: 100,
    name: "Hero",
    profession: "w",
  },
  map: { id: 10, name: "Map", visibility: 30 },
  world: "pandora",
} as const;

const npc = {
  icon: "npc.gif",
  id: 501,
  level: 300,
  name: "Npc",
  profession: "m",
  templateId: 501,
  type: 2,
  weight: 85,
  x: 1,
  y: 2,
} as const;

describe("RuntimeStateSynchronizer", () => {
  beforeEach(() => {
    useGameStore.getState().clearGame();
    useNpcsStore.getState().clearNpcs();
    useOthersStore.getState().clearOthers();
    usePartyStore.getState().clearParty();
    useFriendsStore.getState().clearFriends();
  });

  it("bootstraps an empty but ready world and reconciles affected npc ids after Margonem", () => {
    let applied: ((envelope: RuntimeEventEnvelope) => void) | undefined;
    const currentNpc = npc;
    const adapter = {
      getAllNpcs: vi.fn(() => []),
      getAllOtherHandles: vi.fn(() => ({})),
      getAllOthers: vi.fn(() => ({})),
      getGameSnapshot: vi.fn(() => game),
      getNpc: vi.fn(() => currentNpc),
      getOther: vi.fn(),
      getOtherHandle: vi.fn(),
      getStateSnapshot: vi.fn(() => ({
        friends: [],
        game,
        npcs: [],
        others: {},
        party: [],
      })),
    } as unknown as MargonemRuntimeAdapter;
    const synchronizer = new RuntimeStateSynchronizer({
      adapter,
      bridge: {
        subscribeApplied: (handler) => {
          applied = handler;
          return vi.fn();
        },
      },
    });

    synchronizer.install();
    expect(useNpcsStore.getState().status).toBe("ready");
    applied?.({ raw: { npcs: [{ id: 501 }] } } as RuntimeEventEnvelope);

    expect(useNpcsStore.getState().getNpc(501)).toEqual(npc);
    expect(adapter.getNpc).toHaveBeenCalledTimes(1);
  });

  it("reconciles party, friends and touched others once on applied", () => {
    let applied: ((envelope: RuntimeEventEnvelope) => void) | undefined;
    const other = Object.freeze({
      accountId: "22",
      characterId: "11",
      icon: "other.gif",
      level: 300,
      name: "Other",
      profession: "w",
    });
    const handle = { d: { account: 22, id: 11 } };
    const adapter = {
      getAllNpcs: () => [],
      getAllOtherHandles: () => ({}),
      getAllOthers: () => ({}),
      getGameSnapshot: () => game,
      getNpc: vi.fn(),
      getOther: vi.fn(() => other),
      getOtherHandle: vi.fn(() => handle),
      getStateSnapshot: () => ({
        friends: [],
        game,
        npcs: [],
        others: {},
        party: [],
      }),
    } as unknown as MargonemRuntimeAdapter;
    const synchronizer = new RuntimeStateSynchronizer({
      adapter,
      bridge: {
        subscribeApplied: (handler) => {
          applied = handler;
          return vi.fn();
        },
      },
    });
    synchronizer.install();
    const othersRevision = useOthersStore.getState().revision;

    applied?.({
      raw: {
        friends: [
          "55",
          "Friend",
          "friend.gif",
          "300",
          "0",
          "m",
          "Map",
          "1",
          "2",
          "online",
          "unused",
        ],
        friends_max: 25,
        other: { 11: { x: 1, y: 2 } },
        party: {
          members: {
            1: {
              account: 2,
              commander: 1,
              icon: "hero.gif",
              id: 1,
              nick: "Hero",
            },
          },
        },
      },
    } as unknown as RuntimeEventEnvelope);

    expect(useOthersStore.getState().getOther("11")).toBe(other);
    expect(useOthersStore.getState().revision).toBe(othersRevision + 1);
    expect(usePartyStore.getState().members[0]?.characterId).toBe("1");
    expect(useFriendsStore.getState().friends[0]?.characterId).toBe("55");
    expect(useFriendsStore.getState().friendsMax).toBe(25);
  });
});
