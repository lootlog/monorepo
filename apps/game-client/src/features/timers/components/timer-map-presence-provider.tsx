import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSocket } from "@/contexts/socket-context";
import { NpcType } from "@/api/npcs.api";
import {
  getPlayersPresenceSource,
  type PlayersPresenceSource,
} from "@/lib/players-presence-source";
import type { AppSocket } from "@/lib/socket";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

type PresenceTimer = Pick<
  TimerWithTimeLeft,
  "npc" | "world" | "guildId" | "mergedGuildIds"
>;

const emptySources = new Map<string, PlayersPresenceSource>();

const TimerMapPresenceContext =
  createContext<ReadonlyMap<string, PlayersPresenceSource>>(emptySources);

const scopeKey = (guildId: string, world: string) =>
  JSON.stringify([guildId, world]);

const timerGuildIds = (timer: PresenceTimer) =>
  timer.mergedGuildIds?.map((entry) => entry.guildId) ?? [timer.guildId];

function getTimerMapName(timer: PresenceTimer): string | undefined {
  if (timer.npc.type === NpcType.HERO || timer.npc.type === NpcType.EVENT_HERO)
    return undefined;

  return timer.npc.location;
}

function resolveTimerSources(
  socket: AppSocket | null,
  timers: readonly PresenceTimer[],
) {
  if (!socket) return emptySources;
  const sources = new Map<string, PlayersPresenceSource>();

  for (const timer of timers) {
    if (!getTimerMapName(timer)) continue;

    for (const guildId of timerGuildIds(timer)) {
      const key = scopeKey(guildId, timer.world);

      if (!sources.has(key))
        sources.set(
          key,
          getPlayersPresenceSource(socket, guildId, timer.world),
        );
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

export function useTimerMapPresence(timer: PresenceTimer): boolean {
  const sources = useContext(TimerMapPresenceContext);

  const mapName = getTimerMapName(timer);

  const matching = mapName
    ? timerGuildIds(timer).flatMap((guildId) => {
        const source = sources.get(scopeKey(guildId, timer.world));

        return source ? [source] : [];
      })
    : [];

  const subscribe = (listener: () => void) => {
    if (!mapName) return () => {};

    const releases = matching.map((source) =>
      source.subscribeMap(mapName, listener),
    );

    return () => {
      for (const release of releases) release();
    };
  };

  const getSnapshot = () =>
    Boolean(
      mapName && matching.some((source) => source.isMapOccupied(mapName)),
    );

  return useSyncExternalStore(subscribe, getSnapshot);
}
