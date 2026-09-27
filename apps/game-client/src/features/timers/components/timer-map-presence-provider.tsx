import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { groupBy, maxBy, uniqBy } from "es-toolkit";
import { useSocket } from "@/contexts/socket-context";
import { NpcType } from "@/api/npcs.api";
import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import {
  getMapThreatSource,
  isMapThreatEnemyFresh,
  type MapThreat,
} from "@/lib/map-threat-source";
import type { MapOccupancy } from "@/lib/presence-map-index";
import type { AppSocket } from "@/lib/socket";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

type PresenceTimer = Pick<
  TimerWithTimeLeft,
  "npc" | "world" | "guildId" | "mergedGuildIds"
>;

type MapProjection<Value> = {
  subscribeMap: (mapName: string, listener: () => void) => () => void;
  read: (mapName: string) => Value | undefined;
};

type TimerMapSources = {
  occupancy: MapProjection<MapOccupancy>;
  threat: MapProjection<MapThreat>;
  retain: () => () => void;
};

const emptySources = new Map<string, TimerMapSources>();

const TimerMapPresenceContext =
  createContext<ReadonlyMap<string, TimerMapSources>>(emptySources);

const scopeKey = (guildId: string, world: string) =>
  JSON.stringify([guildId, world]);

const timerGuildIds = (timer: PresenceTimer) =>
  timer.mergedGuildIds?.map((entry) => entry.guildId) ?? [timer.guildId];

function getTimerMapName(timer: PresenceTimer): string | undefined {
  if (timer.npc.type === NpcType.HERO || timer.npc.type === NpcType.EVENT_HERO)
    return undefined;

  return timer.npc.location;
}

function createTimerMapSources(
  socket: AppSocket,
  guildId: string,
  world: string,
): TimerMapSources {
  const presence = getPlayersPresenceSource(socket, guildId, world);
  const threats = getMapThreatSource(socket, guildId, world);

  return {
    occupancy: {
      subscribeMap: presence.subscribeMap,
      read: presence.getMapOccupancy,
    },
    threat: { subscribeMap: threats.subscribeMap, read: threats.getMapThreat },
    retain: () => {
      const releasePresence = presence.retain();
      const releaseThreats = threats.retain();

      return () => {
        releasePresence();
        releaseThreats();
      };
    },
  };
}

function resolveTimerSources(
  socket: AppSocket | null,
  timers: readonly PresenceTimer[],
) {
  if (!socket) return emptySources;
  const sources = new Map<string, TimerMapSources>();

  for (const timer of timers) {
    if (!getTimerMapName(timer)) continue;

    for (const guildId of timerGuildIds(timer)) {
      const key = scopeKey(guildId, timer.world);

      if (!sources.has(key))
        sources.set(key, createTimerMapSources(socket, guildId, timer.world));
    }
  }

  return sources;
}

export function TimerMapPresenceProvider({
  timers,
  children,
}: {
  timers: readonly PresenceTimer[];
  children: ReactNode;
}) {
  const { socket } = useSocket();
  const sources = resolveTimerSources(socket, timers);
  useEffect(() => {
    const releases = [...resolveTimerSources(socket, timers).values()].map(
      (source) => source.retain(),
    );

    return () => {
      for (const release of releases) release();
    };
  }, [socket, timers]);

  return (
    <TimerMapPresenceContext.Provider value={sources}>
      {children}
    </TimerMapPresenceContext.Provider>
  );
}

/** Returns the previous result while every source still returns the same value. */
function createMergedReader<Value>(merge: (values: readonly Value[]) => Value) {
  let inputs: readonly (Value | undefined)[] = [];
  let output: Value | undefined;

  return (next: readonly (Value | undefined)[]): Value | undefined => {
    if (
      next.length === inputs.length &&
      next.every((value, index) => value === inputs[index])
    )
      return output;
    inputs = next;
    const values = next.filter((value) => value !== undefined);
    output = values.length > 1 ? merge(values) : values[0];

    return output;
  };
}

function useTimerMapProjection<Value>(
  timer: PresenceTimer,
  select: (sources: TimerMapSources) => MapProjection<Value>,
  merge: (values: readonly Value[]) => Value,
): Value | undefined {
  const sources = useContext(TimerMapPresenceContext);
  const [readMerged] = useState(() => createMergedReader(merge));
  const mapName = getTimerMapName(timer);

  const matching = mapName
    ? timerGuildIds(timer).flatMap((guildId) => {
        const source = sources.get(scopeKey(guildId, timer.world));

        return source ? [select(source)] : [];
      })
    : [];

  const subscribe = (listener: () => void) => {
    if (!mapName) return () => {};

    const releases = matching.map((projection) =>
      projection.subscribeMap(mapName, listener),
    );

    return () => {
      for (const release of releases) release();
    };
  };

  const getSnapshot = () =>
    mapName
      ? readMerged(matching.map((projection) => projection.read(mapName)))
      : undefined;

  return useSyncExternalStore(subscribe, getSnapshot);
}

const mergeOccupancy = (values: readonly MapOccupancy[]): MapOccupancy => {
  const players = uniqBy(
    values.flatMap((value) => value.players),
    (player) => player.key,
  ).sort(
    (first, second) =>
      first.name.localeCompare(second.name) ||
      first.key.localeCompare(second.key),
  );

  return { players, allAfk: players.every((player) => player.isAfk) };
};

const mergeThreats = (values: readonly MapThreat[]): MapThreat => {
  const now = Date.now();

  const byTarget = groupBy(
    values.flatMap((value) => value.enemies),
    (enemy) => enemy.targetId,
  );

  const enemies = Object.values(byTarget)
    .flatMap((sightings) => {
      const latest = maxBy(sightings, (enemy) => enemy.seenAt);

      return latest ? [latest] : [];
    })
    .sort(
      (first, second) =>
        Number(isMapThreatEnemyFresh(second, now)) -
          Number(isMapThreatEnemyFresh(first, now)) ||
        first.nickname.localeCompare(second.nickname),
    );

  return {
    enemies,
    freshCount: enemies.filter((enemy) => isMapThreatEnemyFresh(enemy, now))
      .length,
  };
};

/** Organization members on the timer's map, or undefined when none are or presence is unavailable. */
export function useTimerMapPresence(
  timer: PresenceTimer,
): MapOccupancy | undefined {
  return useTimerMapProjection(
    timer,
    (sources) => sources.occupancy,
    mergeOccupancy,
  );
}

/** Clan enemies seen on the timer's map within the AirTag threat window. */
export function useTimerMapThreat(timer: PresenceTimer): MapThreat | undefined {
  return useTimerMapProjection(
    timer,
    (sources) => sources.threat,
    mergeThreats,
  );
}
