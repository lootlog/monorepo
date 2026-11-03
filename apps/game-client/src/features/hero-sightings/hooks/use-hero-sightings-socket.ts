import { useEffect, useEffectEvent, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { HeroSighting } from "@/api/hero-sightings.api";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { queryKeys } from "@/features/public-api/query-keys";
import { upsertHeroSightings } from "@/features/hero-sightings/hero-sightings-cache";

/** Applies live sighting changes and catches up on what a disconnect missed. */
export const useHeroSightingsSocket = () => {
  const { socket, connected, joined, status } = useSocket();
  const queryClient = useQueryClient();
  const needsCatchUp = useRef(false);

  // The gateway forwards the API's sighting response as is.
  const handleUpdate = useEffectEvent((sighting: HeroSighting) => {
    upsertHeroSightings(queryClient, [sighting]);
  });

  const refreshAfterReconnect = useEffectEvent(() => {
    const queryKey = queryKeys.allHeroSightings();
    void queryClient.cancelQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey });
  });

  useEffect(() => {
    if (status === "unreachable") needsCatchUp.current = true;

    if (!connected || !joined || !socket) return;

    const onUpdate = (sighting: HeroSighting) => handleUpdate(sighting);

    socket.on(GatewayEvent.HERO_SIGHTING_UPDATE, onUpdate);

    if (needsCatchUp.current) refreshAfterReconnect();
    needsCatchUp.current = true;

    return () => {
      socket.off(GatewayEvent.HERO_SIGHTING_UPDATE, onUpdate);
    };
  }, [connected, joined, socket, status]);
};
