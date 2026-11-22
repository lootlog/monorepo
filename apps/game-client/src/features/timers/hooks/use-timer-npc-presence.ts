import { useEffect, useSyncExternalStore } from "react";
import { useSocket } from "@/contexts/socket-context";
import {
  getNpcPresenceSource,
  type NpcStanding,
} from "@/lib/npc-presence-source";
import { timerGuildIds } from "../components/timer-map-presence-provider";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

type PresenceTimer = Pick<
  TimerWithTimeLeft,
  "npc" | "world" | "guildId" | "mergedGuildIds" | "updatedAt"
>;

export function useTimerNpcPresence(
  timer: PresenceTimer,
): NpcStanding | undefined {
  const { socket } = useSocket();
  const guildIds = timerGuildIds(timer);
  const npcId = timer.npc.id;

  const sources = socket
    ? guildIds.map((guildId) =>
        getNpcPresenceSource(socket, guildId, timer.world),
      )
    : [];

  const world = timer.world;
  const guildIdsKey = guildIds.join(",");

  useEffect(() => {
    if (!socket) return;

    const releases = guildIdsKey
      .split(",")
      .map((guildId) => getNpcPresenceSource(socket, guildId, world).retain());

    return () => {
      for (const release of releases) release();
    };
  }, [socket, guildIdsKey, world]);

  const standing = useSyncExternalStore(
    (listener) => {
      const releases = sources.map((source) =>
        source.subscribeNpc(npcId, listener),
      );

      return () => {
        for (const release of releases) release();
      };
    },
    () => {
      let earliest: NpcStanding | undefined;

      for (const source of sources) {
        const sourceStanding = source.getStanding(npcId);

        if (
          sourceStanding !== undefined &&
          (earliest === undefined || sourceStanding.since < earliest.since)
        )
          earliest = sourceStanding;
      }

      return earliest;
    },
  );

  return standing !== undefined && standing.since > Date.parse(timer.updatedAt)
    ? standing
    : undefined;
}
