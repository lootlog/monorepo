import type { GameEvent } from "@lootlog/margonem/game-events";
import { applyGameEvent } from "./apply-event";
import { logSandbox } from "./sandbox-log";
import type { SandboxWorld } from "./world";

// Native wrappers such as Npc and Other keep identity across reads; Lootlog
// caches other-player handles and patches tooltip methods on them.
function createHandleCache<Data extends object>() {
  const handles = new WeakMap<Data, { d: Data }>();

  return (data: Data) => {
    let handle = handles.get(data);

    if (!handle) {
      handle = { d: data };
      handles.set(data, handle);
    }

    return handle;
  };
}

function mapValues<Data extends object, Handle>(
  record: Record<string, Data>,
  toHandle: (data: Data) => Handle,
): Record<string, Handle> {
  return Object.fromEntries(
    Object.entries(record).map(([id, data]) => [id, toHandle(data)]),
  );
}

// Covers the Engine surface read by src/lib/margonem-runtime adapters. Optional
// subsystems (renderer, minimap, chat host, tooltips) stay absent so their
// adapters take the same "unavailable" path they take during game startup.
export function createNiEngine(world: SandboxWorld) {
  const npcHandle = createHandleCache<SandboxWorld["npcs"][string]>();
  const otherHandle = createHandleCache<SandboxWorld["others"][string]>();

  const logOutbound = (command: string) => logSandbox("outbound", command);

  return {
    communication: {
      parseJSON(data: GameEvent) {
        applyGameEvent(world, data);
      },
      send: logOutbound,
      send2: logOutbound,
    },
    interface: {
      alreadyInitialised: true,
      getAlreadyInitialised: () => true,
    },
    hero: { d: world.hero },
    map: {
      d: world.map,
      offset: [0, 0],
      size: { x: 64, y: 64 },
      getOffset: () => [0, 0],
    },
    worldConfig: { getWorldName: () => world.world },
    npcs: {
      check: () => mapValues(world.npcs, npcHandle),
      getById: (id: number) => {
        const npc = world.npcs[String(id)];

        return npc ? npcHandle(npc) : undefined;
      },
      getDrawableList: () => [],
    },
    others: {
      check: () => mapValues(world.others, otherHandle),
      getById: (id: number | string) => {
        const other = world.others[String(id)];

        return other ? otherHandle(other) : undefined;
      },
      getDrawableList: () => [],
    },
    party: { getMembers: () => new Map(world.party) },
    showEqManager: {
      update: (character: { nick: string }) =>
        logSandbox("message", `showEqManager.update(${character.nick})`),
    },
    iframeWindowManager: {
      newPlayerProfile: (ids: { accountId: number; characterId: number }) =>
        logSandbox(
          "message",
          `newPlayerProfile(${ids.accountId}, ${ids.characterId})`,
        ),
    },
  };
}
