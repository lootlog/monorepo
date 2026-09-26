import { toast } from "sonner";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useCurrentGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { readSettingsValue } from "@/features/settings/persistence/settings-snapshot";
import { playSound } from "@/lib/sound-playback";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { normalizePings } from "@lootlog/domain/account-preferences";
import {
  isMapPingType,
  type MapPingAck,
  type MapPingEvent,
  type MapPingType,
} from "@lootlog/schema/map-ping";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { isMapPingSurface, mapPingController } from "./map-ping-controller";
import type {
  ClientPoint,
  PingInteractionStart,
  PingMenu,
} from "./ping-interaction-controller";
import {
  MAP_PING_CENTRE_TYPE,
  MAP_PING_RING_TYPES,
  getPingPresentation,
} from "./ping-presentation";

const ACK_TIMEOUT_MS = 1_500;

const HINT_THROTTLE_MS = 2_000;

const REGISTER_RETRY_MS = 100;

const MAP_PING_MENU: PingMenu = {
  centre: MAP_PING_CENTRE_TYPE,
  quick: MAP_PING_CENTRE_TYPE,
  ring: MAP_PING_RING_TYPES,
  title: null,
};

export type PingPointer = ClientPoint & { target: EventTarget | null };

export const areMapPingsEnabled = () =>
  Boolean(useGameStore.getState().game?.hero.accountId) &&
  normalizePings(readSettingsValue("gameData.pings")).enabled;

/** Throttled toast for rejections the player can act on. */
export const useRejectedPingHint = () => {
  const lastHintAtRef = useRef(0);
  const { t } = useTranslation("pings");

  return (acknowledgement: Extract<MapPingAck, { status: "rejected" }>) => {
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

    toast.warning(
      acknowledgement.code === "rate-limited"
        ? t("rateLimited", {
            seconds: Math.max(
              1,
              Math.ceil((acknowledgement.retryAfterMs ?? 1_000) / 1_000),
            ),
          })
        : t("temporarilyUnavailable"),
    );
  };
};

export const useMapPings = () => {
  const { socket, connected, joined } = useSocket();

  const isNewInterface = useGameStore(
    (state) => state.game?.interface === "ni",
  );

  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );

  const { data: preferences } = useCurrentGameAccountPreferences();
  const enabled = preferences?.pings.enabled ?? false;
  const active = enabled && gameInitialized && isNewInterface;
  const showHint = useRejectedPingHint();
  const { t } = useTranslation("pings");

  useEffect(() => {
    if (!active) {
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
  }, [active]);

  useEffect(() => {
    if (enabled && connected && joined) {
      return;
    }

    mapPingController.clear();
  }, [connected, enabled, joined]);

  useEffect(() => {
    if (!enabled || !connected || !joined || !socket || !isNewInterface) {
      return;
    }

    const handleMapPing = (event: MapPingEvent) => {
      const tile = { x: event.x, y: event.y };
      const game = useGameStore.getState().game;

      if (
        !game ||
        !isMapPingType(event.type) ||
        !areMapPingsEnabled() ||
        event.world !== game.world ||
        event.mapId !== game.map.id ||
        !mapPingController.isTileValid(tile)
      ) {
        return;
      }

      const presentation = getPingPresentation(event.type);

      if (mapPingController.addRemote(event, t(presentation.translationKey))) {
        playSound("pings", "mapPing", {
          playbackRate: presentation.playbackRate,
          preservesPitch: false,
        });
      }
    };

    socket.on(GatewayEvent.MAP_PING_RECEIVE, handleMapPing);

    return () => {
      socket.off(GatewayEvent.MAP_PING_RECEIVE, handleMapPing);
    };
  }, [connected, enabled, isNewInterface, joined, socket, t]);

  /** Resolves the map tile under a press or the last known pointer. */
  const resolveStart = (
    pointer: PingPointer,
  ): Omit<PingInteractionStart, "identity"> | null => {
    const mapId = useGameStore.getState().game?.map.id;

    if (
      !isNewInterface ||
      !socket ||
      !connected ||
      !joined ||
      !areMapPingsEnabled() ||
      !isMapPingSurface(pointer.target) ||
      mapId === undefined ||
      !Number.isInteger(mapId)
    ) {
      return null;
    }

    const tile = mapPingController.resolveTile(
      pointer.target,
      pointer.x,
      pointer.y,
    );

    return tile
      ? {
          menu: MAP_PING_MENU,
          origin: { x: pointer.x, y: pointer.y },
          target: { kind: "map", mapId, tile },
        }
      : null;
  };

  const send = (
    mapId: number,
    tile: { x: number; y: number },
    type: MapPingType,
  ) => {
    const game = useGameStore.getState().game;

    if (
      !socket ||
      !connected ||
      !joined ||
      !areMapPingsEnabled() ||
      game?.map.id !== mapId ||
      !mapPingController.isTileValid(tile)
    ) {
      return;
    }

    const presentation = getPingPresentation(type);

    const localPingId = mapPingController.addOptimistic(
      tile,
      mapId,
      game.hero.name,
      type,
      t(presentation.translationKey),
    );

    playSound("pings", "mapPing", {
      playbackRate: presentation.playbackRate,
      preservesPitch: false,
    });
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit(
        GatewayEvent.MAP_PING_SEND,
        { expectedMapId: mapId, type, x: tile.x, y: tile.y },
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
  };

  return { active, resolveStart, send };
};
