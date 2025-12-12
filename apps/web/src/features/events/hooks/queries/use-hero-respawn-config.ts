import { useMemo } from "react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useEventHeroTimers } from "./use-event-hero-timers";
import {
  useWindowStatus,
  type WindowStatus,
} from "../use-window-status";

export type { WindowStatus };

export interface RespawnConfig {
  hasTimer: boolean;
  windowStatus: WindowStatus;
  minSpawnTime: string | null;
  maxSpawnTime: string | null;
}

interface UseHeroRespawnConfigOptions {
  eventId: string;
  heroNpcId?: number | null; // For npcId-based matching
  heroName?: string; // For name-based matching (first spawn)
}

/**
 * Hook to get respawn configuration for an event hero.
 *
 * Uses the existing useEventHeroTimers hook (which is WebSocket-invalidated)
 * and calculates windowStatus client-side, eliminating polling.
 *
 * Matching priority:
 * 1. By npcId (if available) - exact match
 * 2. By npcName - fallback for first-ever spawns when npcId is unknown
 */
export const useHeroRespawnConfig = ({
  eventId,
  heroNpcId,
  heroName,
}: UseHeroRespawnConfigOptions): RespawnConfig => {
  const guildId = useGuildId();
  const { world } = useGuildContext();

  // Use existing event timers hook (already WebSocket-invalidated via use-event-socket.ts)
  const { data: timers } = useEventHeroTimers({
    guildId: guildId ?? "",
    eventId,
    world: world ?? "",
  });

  // Find matching timer by npcId or name
  const timer = useMemo(() => {
    if (!timers) return undefined;

    // Prefer npcId match (exact)
    if (heroNpcId) {
      const byId = timers.find((t) => t.npcId === heroNpcId);
      if (byId) return byId;
    }

    // Fallback to name match (for first-ever spawns)
    if (heroName) {
      return timers.find((t) => t.npc?.name === heroName);
    }

    return undefined;
  }, [timers, heroNpcId, heroName]);

  // Calculate windowStatus client-side (schedules timeouts at boundaries)
  const windowStatus = useWindowStatus(
    timer?.minSpawnTime ?? null,
    timer?.maxSpawnTime ?? null,
  );

  return {
    hasTimer: !!timer,
    windowStatus,
    minSpawnTime: timer?.minSpawnTime ?? null,
    maxSpawnTime: timer?.maxSpawnTime ?? null,
  };
};
