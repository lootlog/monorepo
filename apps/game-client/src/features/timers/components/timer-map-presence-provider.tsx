import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { uniqBy } from "es-toolkit";
import {
  getHeroSightingKey,
  HERO_SIGHTING_STALE_AFTER_MS,
  isCurrentHeroSighting,
  isHeroSightingStale,
} from "@lootlog/domain/hero-sightings";
import { HeroSightingState } from "@lootlog/schema/hero-sightings";
import { useSocket } from "@/contexts/socket-context";
import { NpcType } from "@/api/npcs.api";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { useLoadedHeroSightings } from "@/hooks/api/use-hero-sightings";
import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import {
  getMapThreatSource,
  projectMapThreat,
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

/** Open hero sightings by Organization, world and hero. */
type HeroSightingIndex = ReadonlyMap<string, HeroSightingResponseDto>;

const emptyHeroSightings: HeroSightingIndex = new Map();

const TimerMapPresenceContext = createContext<{
  sources: ReadonlyMap<string, TimerMapSources>;
  heroSightings: HeroSightingIndex;
  /** The time staleness is judged at; it moves when a sighting turns stale. */
  now: number;
}>({ sources: emptySources, heroSightings: emptyHeroSightings, now: 0 });

const scopeKey = (guildId: string, world: string) =>
  JSON.stringify([guildId, world]);

const heroSightingKey = (guildId: string, world: string, heroKey: string) =>
  JSON.stringify([guildId, world, heroKey]);

function indexOpenHeroSightings(
  sightings: readonly HeroSightingResponseDto[],
): HeroSightingIndex {
  if (sightings.length === 0) return emptyHeroSightings;
  const index = new Map<string, HeroSightingResponseDto>();

  for (const sighting of sightings) {
    if (sighting.closedAt !== null) continue;
    index.set(
      heroSightingKey(sighting.guildId, sighting.world, sighting.hero.key),
      sighting,
    );
  }

  return index;
}

export const timerGuildIds = (
  timer: Pick<TimerWithTimeLeft, "guildId" | "mergedGuildIds">,
) => timer.mergedGuildIds?.map((entry) => entry.guildId) ?? [timer.guildId];

// Heroes move between maps, so where one was killed says nothing; a hero
// detector's answer tells where it is now.
const DETECTABLE_HERO_TYPES = new Set<string>([
  NpcType.HERO,
  NpcType.EVENT_HERO,
]);

/**
 * The newest open sighting of the timer's hero in its Organizations; with
 * `currentAt`, only one that still places the hero at that time.
 */
function findTimerHeroSighting(
  timer: PresenceTimer,
  heroSightings: HeroSightingIndex,
  currentAt?: number,
): HeroSightingResponseDto | undefined {
  if (!DETECTABLE_HERO_TYPES.has(timer.npc.type) || heroSightings.size === 0)
    return undefined;

  const heroKey = getHeroSightingKey(timer.npc.name);
  let newest: HeroSightingResponseDto | undefined;

  for (const guildId of timerGuildIds(timer)) {
    const sighting = heroSightings.get(
      heroSightingKey(guildId, timer.world, heroKey),
    );

    if (
      sighting &&
      (currentAt === undefined || isCurrentHeroSighting(sighting, currentAt)) &&
      (!newest ||
        Date.parse(sighting.lastSeenAt) > Date.parse(newest.lastSeenAt))
    )
      newest = sighting;
  }

  return newest;
}

function getTimerMapName(
  timer: PresenceTimer,
  heroSightings: HeroSightingIndex,
  now: number,
): string | undefined {
  // Hero Trackers move between maps and no detector answers for them.
  if (timer.npc.type === NpcType.HERO_TRACKER) return undefined;

  // A roaming hero nobody confirmed lately has likely moved on, so its old
  // map's players and enemies say nothing about it.
  if (DETECTABLE_HERO_TYPES.has(timer.npc.type))
    return findTimerHeroSighting(timer, heroSightings, now)?.mapName;

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
  heroSightings: HeroSightingIndex,
  now: number,
) {
  if (!socket) return emptySources;
  const sources = new Map<string, TimerMapSources>();

  for (const timer of timers) {
    if (!getTimerMapName(timer, heroSightings, now)) continue;

    for (const guildId of timerGuildIds(timer)) {
      const key = scopeKey(guildId, timer.world);

      if (!sources.has(key))
        sources.set(key, createTimerMapSources(socket, guildId, timer.world));
    }
  }

  return sources;
}

/** When the next open roaming sighting turns stale, after `now`. */
function getNextStaleAt(
  sightings: readonly HeroSightingResponseDto[],
  now: number,
): number | undefined {
  let next: number | undefined;

  for (const sighting of sightings) {
    if (
      sighting.state !== HeroSightingState.ROAMING ||
      !isCurrentHeroSighting(sighting, now)
    )
      continue;

    // Staleness is strict, so it starts just after the window ends.
    const staleAt =
      Date.parse(sighting.lastSeenAt) + HERO_SIGHTING_STALE_AFTER_MS + 1;

    if (next === undefined || staleAt < next) next = staleAt;
  }

  return next;
}

/**
 * The time sightings are judged at. Rather than ticking, it moves only when
 * a roaming sighting crosses into staleness, so the timers re-render once
 * per sighting that turns unconfirmed.
 */
function useHeroSightingsStaleClock(
  sightings: readonly HeroSightingResponseDto[],
): number {
  const [now, setNow] = useState(Date.now);
  const nextStaleAt = getNextStaleAt(sightings, now);

  useEffect(() => {
    if (nextStaleAt === undefined) return;

    // A timer may fire a millisecond before `Date.now()` reaches its delay;
    // judged that early, the sighting is still current, `nextStaleAt` stays
    // the same and the clock would never move again.
    const timeout = window.setTimeout(
      () => setNow(Math.max(Date.now(), nextStaleAt)),
      Math.max(0, nextStaleAt - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [nextStaleAt]);

  return now;
}

export function TimerMapPresenceProvider({
  timers,
  children,
}: {
  timers: readonly PresenceTimer[];
  children: ReactNode;
}) {
  const { socket } = useSocket();
  const worlds = [...new Set(timers.map((timer) => timer.world))];
  const loadedHeroSightings = useLoadedHeroSightings(worlds);
  const now = useHeroSightingsStaleClock(loadedHeroSightings);
  const heroSightings = indexOpenHeroSightings(loadedHeroSightings);
  const sources = resolveTimerSources(socket, timers, heroSightings, now);
  useEffect(() => {
    const releases = [
      ...resolveTimerSources(
        socket,
        timers,
        indexOpenHeroSightings(loadedHeroSightings),
        now,
      ).values(),
    ].map((source) => source.retain());

    return () => {
      for (const release of releases) release();
    };
  }, [socket, timers, loadedHeroSightings, now]);

  return (
    <TimerMapPresenceContext.Provider value={{ sources, heroSightings, now }}>
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
  const { sources, heroSightings, now } = useContext(TimerMapPresenceContext);
  const [readMerged] = useState(() => createMergedReader(merge));
  const mapName = getTimerMapName(timer, heroSightings, now);

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

const mergeThreats = (values: readonly MapThreat[]): MapThreat =>
  projectMapThreat(
    values.flatMap((value) => value.enemies),
    Date.now(),
  );

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

/** The open sighting a detector last placed the timer's hero by. */
export type TimerHeroSighting = {
  readonly sighting: HeroSightingResponseDto;
  /** A roaming hero nobody confirmed lately; it no longer places the timer. */
  readonly unconfirmed: boolean;
};

/** Where a detector last placed the timer's hero, while that sighting is open. */
export function useTimerHeroSighting(
  timer: PresenceTimer,
): TimerHeroSighting | undefined {
  const { heroSightings, now } = useContext(TimerMapPresenceContext);
  const sighting = findTimerHeroSighting(timer, heroSightings);

  return sighting
    ? { sighting, unconfirmed: isHeroSightingStale(sighting, now) }
    : undefined;
}
