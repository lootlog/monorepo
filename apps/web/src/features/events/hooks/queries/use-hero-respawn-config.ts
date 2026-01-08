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
  heroNpcId?: number | null;
  heroName?: string;
}

export const useHeroRespawnConfig = ({
  eventId,
  heroNpcId,
  heroName,
}: UseHeroRespawnConfigOptions): RespawnConfig => {
  const guildId = useGuildId();
  const { world } = useGuildContext();

  const { data: timers } = useEventHeroTimers({
    guildId: guildId ?? "",
    eventId,
    world: world ?? "",
  });

  const timer = useMemo(() => {
    if (!timers) return undefined;

    if (heroNpcId) {
      const byId = timers.find((t) => t.npcId === heroNpcId);
      if (byId) return byId;
    }

    if (heroName) {
      return timers.find((t) => t.npc?.name === heroName);
    }

    return undefined;
  }, [timers, heroNpcId, heroName]);

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
