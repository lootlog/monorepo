import { useCallback, useEffect, useState } from "react";
import { useGlobalStore } from "@/store/global.store";
import { isEventActiveAtTimestamp } from "../utils/event-activity";

interface Event {
  id: string;
  guildId: string;
  name: string;
  world: string;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  maps: EventMap[];
  heroNpcs: EventHeroNpc[];
  rankings: EventRanking[];
}

interface EventMap {
  id: string;
  mapName: string;
  assignedMemberId?: number;
  assignedMember?: {
    id: number;
    name: string;
  };
}

interface EventHeroNpc {
  id: string;
  npcId: number;
  npcName: string;
  mapName: string;
}

interface EventRanking {
  id: string;
  memberId: number;
  totalPoints: number;
  totalKills: number;
  member: {
    id: number;
    name: string;
  };
}

interface UseEventOptions {
  guildId: string;
  world?: string;
}

export const useEvent = ({ guildId, world }: UseEventOptions) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);

  const fetchEvents = useCallback(async () => {
    if (!guildId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (world) params.set("world", world);
      params.set("activeOnly", "true");

      const response = await fetch(
        `/api/guilds/${guildId}/events?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [guildId, world]);

  const refetch = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (gameInitialized && guildId) {
      fetchEvents();
    }
  }, [gameInitialized, guildId, fetchEvents]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const currentlyActiveEvents = events.filter((event) =>
      isEventActiveAtTimestamp(event, currentTimestamp),
    );

    if (currentlyActiveEvents.length === 0) {
      if (activeEvent !== null) {
        setActiveEvent(null);
      }
      return;
    }

    if (
      activeEvent === null ||
      !currentlyActiveEvents.some((event) => event.id === activeEvent.id)
    ) {
      setActiveEvent(currentlyActiveEvents[0]);
    }
  }, [activeEvent, currentTimestamp, events]);

  return {
    events,
    activeEvent,
    loading,
    error,
    refetch,
    setActiveEvent,
  };
};

export type { Event, EventMap, EventHeroNpc, EventRanking };
