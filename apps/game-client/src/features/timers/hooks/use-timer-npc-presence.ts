import { useEffect, useSyncExternalStore } from "react";
import { useSocket } from "@/contexts/socket-context";
import { getNpcPresenceSource } from "@/lib/npc-presence-source";
import { timerGuildIds } from "../components/timer-map-presence-provider";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

type PresenceTimer = Pick<
  TimerWithTimeLeft,
  "npc" | "world" | "guildId" | "mergedGuildIds" | "updatedAt"
>;

/**
 * Whether an Organization member sees the timer's NPC standing now. A sighting
 * older than the timer's last change predates the kill that set the timer.
 */
export function useTimerNpcPresence(timer: PresenceTimer): boolean {
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

  const since = useSyncExternalStore(
    (listener) => {
      const releases = sources.map((source) =>
        source.subscribeNpc(npcId, listener),
      );

      return () => {
        for (const release of releases) release();
      };
    },
    () => {
      let earliest: number | undefined;

      for (const source of sources) {
        const sourceSince = source.getStandingSince(npcId);

        if (
          sourceSince !== undefined &&
          (earliest === undefined || sourceSince < earliest)
        )
          earliest = sourceSince;
      }

      return earliest;
    },
  );

  return since !== undefined && since > Date.parse(timer.updatedAt);
}
