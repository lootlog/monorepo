import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useEventHeroTimers } from "./use-event-hero-timers";
import { useWindowStatus, type WindowStatus } from "../use-window-status";
import { findEventHeroTimer } from "../../utils/find-event-hero-timer";

export type { WindowStatus };

export interface RespawnConfig {
  hasTimer: boolean;
  windowStatus: WindowStatus;
  minSpawnTime: string | null;
  maxSpawnTime: string | null;
  overdueMs: number | null;
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

  const timer = findEventHeroTimer(timers, { heroNpcId, heroName });

  const windowStatus = useWindowStatus(
    timer?.minSpawnTime ?? null,
    timer?.maxSpawnTime ?? null,
  );

  return {
    hasTimer: !!timer,
    windowStatus,
    minSpawnTime: timer?.minSpawnTime ?? null,
    maxSpawnTime: timer?.maxSpawnTime ?? null,
    overdueMs:
      windowStatus === "OVERDUE" && timer?.maxSpawnTime
        ? Math.max(0, Date.now() - new Date(timer.maxSpawnTime).getTime())
        : null,
  };
};
