import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { Game } from "@/lib/game";
import { playSound } from "@/lib/sound-playback";
import { useGlobalStore } from "@/store/global.store";
import type { MapPingAck, MapPingEvent } from "@lootlog/types";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  isMapPingSurface,
  mapPingController,
  type MapTile,
} from "./map-ping-controller";

const ACK_TIMEOUT_MS = 1_500;
const HINT_THROTTLE_MS = 2_000;
const REGISTER_RETRY_MS = 100;

type PointerPosition = {
  canvas: HTMLCanvasElement;
  clientX: number;
  clientY: number;
};

export const useMapPings = () => {
  const { socket, connected, joined } = useSocket();
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const { data: preferences } = useCurrentGameAccountPreferences();
  const enabled = preferences?.pings.enabled ?? false;
  const pointerRef = useRef<PointerPosition | null>(null);
  const lastHintAtRef = useRef(0);
  const { t } = useTranslation("settings");

  useEffect(() => {
    if (!gameInitialized) {
      return;
    }

    if (mapPingController.register()) {
      return () => mapPingController.unregister();
    }

    const retryInterval = window.setInterval(() => {
      if (mapPingController.register()) {
        window.clearInterval(retryInterval);
      }
    }, REGISTER_RETRY_MS);

    return () => {
      window.clearInterval(retryInterval);
      mapPingController.unregister();
    };
  }, [gameInitialized]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isMapPingSurface(event.target)) {
        pointerRef.current = null;
        return;
      }

      pointerRef.current = {
        canvas: event.target,
        clientX: event.clientX,
        clientY: event.clientY,
      };
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (enabled) {
      return;
    }

    mapPingController.clear();
  }, [enabled]);

  useEffect(() => {
    if (connected) {
      return;
    }

    mapPingController.clear();
  }, [connected]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMapPing = (event: MapPingEvent) => {
      const tile = { x: event.x, y: event.y };
      if (
        !enabled ||
        event.world !== Game.getWorldName() ||
        event.mapId !== Game.map.id ||
        !mapPingController.isTileValid(tile)
      ) {
        return;
      }

      if (mapPingController.addRemote(event)) {
        playSound("pings", "mapPing");
      }
    };

    socket.on(GatewayEvent.MAP_PING_RECEIVE, handleMapPing);
    return () => {
      socket.off(GatewayEvent.MAP_PING_RECEIVE, handleMapPing);
    };
  }, [enabled, socket]);

  const showHint = (
    acknowledgement: Extract<MapPingAck, { status: "rejected" }>,
  ) => {
    if (
      acknowledgement.code !== "rate-limited" &&
      acknowledgement.code !== "temporarily-unavailable"
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastHintAtRef.current < HINT_THROTTLE_MS) {
      return;
    }
    lastHintAtRef.current = now;

    const message =
      acknowledgement.code === "rate-limited"
        ? t("mapPings.rateLimited", {
            seconds: Math.max(
              1,
              Math.ceil((acknowledgement.retryAfterMs ?? 1_000) / 1_000),
            ),
          })
        : t("mapPings.temporarilyUnavailable");
    window.message?.(message);
  };

  const resolveTriggerTile = (
    event: KeyboardEvent | MouseEvent,
  ): MapTile | null => {
    if (event instanceof MouseEvent) {
      if (!isMapPingSurface(event.target)) {
        return null;
      }

      return mapPingController.resolveTile(
        event.target,
        event.clientX,
        event.clientY,
      );
    }

    const pointer = pointerRef.current;
    if (!pointer) {
      return null;
    }

    return mapPingController.resolveTile(
      pointer.canvas,
      pointer.clientX,
      pointer.clientY,
    );
  };

  return (event: KeyboardEvent | MouseEvent) => {
    if (!enabled || !socket || !connected || !joined) {
      return false;
    }

    const tile = resolveTriggerTile(event);
    const mapId = Game.map.id;
    if (!tile || !Number.isInteger(mapId)) {
      return false;
    }

    const localPingId = mapPingController.addOptimistic(
      tile,
      mapId,
      Game.hero.nick,
    );
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit(
        GatewayEvent.MAP_PING_SEND,
        { expectedMapId: mapId, x: tile.x, y: tile.y },
        (error: Error | null, acknowledgement?: MapPingAck) => {
          if (error || !acknowledgement) {
            return;
          }

          if (acknowledgement.status === "rejected") {
            mapPingController.remove(localPingId);
            showHint(acknowledgement);
          }
        },
      );

    return true;
  };
};
