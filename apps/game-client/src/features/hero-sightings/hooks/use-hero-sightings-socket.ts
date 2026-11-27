import { useEffect, useEffectEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { useSocket } from "@/contexts/socket-context";
import { useReconnectCatchUp } from "@/hooks/use-reconnect-catch-up";
import { queryKeys } from "@/lib/query-keys";
import { upsertHeroSightings } from "@/hooks/api/hero-sightings-cache";

export const useHeroSightingsSocket = () => {
  const { socket, connected, joined } = useSocket();
  const queryClient = useQueryClient();

  const handleUpdate = useEffectEvent((sighting: HeroSightingResponseDto) => {
    upsertHeroSightings(queryClient, [sighting]);
  });

  useEffect(() => {
    if (!connected || !joined || !socket) return;

    const onUpdate = (sighting: HeroSightingResponseDto) =>
      handleUpdate(sighting);

    socket.on("hero-sighting.updated", onUpdate);

    return () => {
      socket.off("hero-sighting.updated", onUpdate);
    };
  }, [connected, joined, socket]);

  useReconnectCatchUp(() => {
    const queryKey = queryKeys.allHeroSightings();
    void queryClient.cancelQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey });
  });
};
