import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { Game } from "@/lib/game";
import { queryClient } from "@/lib/query-client";
import { playSound } from "@/lib/sound-playback";
import { useGlobalStore } from "@/store/global.store";
import { getUsersControllerGetUserGameAccountPreferencesQueryKey } from "@/lib/api/generated/main/users/users";
import type { UserGameAccountPreferencesResponseDtoOutput } from "@/lib/api/generated/main/model";
import {
  isMapPingType,
  type MapPingAck,
  type MapPingEvent,
} from "@lootlog/types";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  isMapPingSurface,
  mapPingController,
  type MapTile,
} from "./map-ping-controller";
import {
  createMapPingPressIdentity,
  mapPingInteractionController,
  type ClientPoint,
  type MapPingSubmission,
} from "./map-ping-interaction-controller";
import { getMapPingPresentation } from "./map-ping-presentation";

const ACK_TIMEOUT_MS = 1_500;
const HINT_THROTTLE_MS = 2_000;
const REGISTER_RETRY_MS = 100;

type PointerPosition = {
  canvas: HTMLCanvasElement;
  clientX: number;
  clientY: number;
};

type ResolvedTrigger = {
  origin: ClientPoint;
  tile: MapTile;
};

const areMapPingsEnabled = () => {
  const accountId = Game.getAccountId();
  if (!accountId) {
    return false;
  }

  const preferences =
    queryClient.getQueryData<UserGameAccountPreferencesResponseDtoOutput>(
      getUsersControllerGetUserGameAccountPreferencesQueryKey({ accountId }),
    );

  return preferences?.pings.enabled ?? false;
};

export const useMapPings = () => {
  const { socket, connected, joined } = useSocket();
  const isNewInterface = Game.interface === "ni";
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const { data: preferences } = useCurrentGameAccountPreferences();
  const enabled = preferences?.pings.enabled ?? false;
  const pointerRef = useRef<PointerPosition | null>(null);
  const lastHintAtRef = useRef(0);
  const { t } = useTranslation("settings");

  useEffect(() => {
    if (!gameInitialized || !isNewInterface) {
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
  }, [gameInitialized, isNewInterface]);

  useEffect(() => {
    if (!isNewInterface) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      mapPingInteractionController.updatePointer({
        x: event.clientX,
        y: event.clientY,
      });
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
  }, [isNewInterface]);

  useEffect(() => {
    if (enabled && connected && joined) {
      return;
    }

    mapPingInteractionController.cancel();
    mapPingController.clear();
  }, [connected, enabled, joined]);

  useEffect(
    () => () => {
      mapPingInteractionController.cancel();
    },
    [],
  );

  useEffect(() => {
    if (!socket || !isNewInterface) {
      return;
    }

    const handleMapPing = (event: MapPingEvent) => {
      const tile = { x: event.x, y: event.y };
      if (
        !isMapPingType(event.type) ||
        !areMapPingsEnabled() ||
        event.world !== Game.getWorldName() ||
        event.mapId !== Game.map.id ||
        !mapPingController.isTileValid(tile)
      ) {
        return;
      }

      const presentation = getMapPingPresentation(event.type);
      const typeLabel = t(presentation.translationKey);
      if (mapPingController.addRemote(event, typeLabel)) {
        const { key, ...soundProfile } = presentation.sound;
        playSound("pings", key, soundProfile);
      }
    };

    socket.on(GatewayEvent.MAP_PING_RECEIVE, handleMapPing);
    return () => {
      socket.off(GatewayEvent.MAP_PING_RECEIVE, handleMapPing);
    };
  }, [enabled, isNewInterface, socket, t]);

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

  const resolveTrigger = (
    event: KeyboardEvent | MouseEvent,
  ): ResolvedTrigger | null => {
    if (event instanceof MouseEvent) {
      if (!isMapPingSurface(event.target)) {
        return null;
      }

      const tile = mapPingController.resolveTile(
        event.target,
        event.clientX,
        event.clientY,
      );
      return tile
        ? { origin: { x: event.clientX, y: event.clientY }, tile }
        : null;
    }

    const pointer = pointerRef.current;
    if (!pointer) {
      return null;
    }

    const tile = mapPingController.resolveTile(
      pointer.canvas,
      pointer.clientX,
      pointer.clientY,
    );
    return tile
      ? {
          origin: { x: pointer.clientX, y: pointer.clientY },
          tile,
        }
      : null;
  };

  const sendMapPing = (submission: MapPingSubmission) => {
    if (
      !socket ||
      !connected ||
      !joined ||
      !areMapPingsEnabled() ||
      Game.map.id !== submission.mapId ||
      !mapPingController.isTileValid(submission.tile)
    ) {
      return;
    }

    const presentation = getMapPingPresentation(submission.type);
    const typeLabel = t(presentation.translationKey);
    const localPingId = mapPingController.addOptimistic(
      submission.tile,
      submission.mapId,
      Game.hero.nick,
      submission.type,
      typeLabel,
    );
    const { key, ...soundProfile } = presentation.sound;
    playSound("pings", key, soundProfile);
    socket.timeout(ACK_TIMEOUT_MS).emit(
      GatewayEvent.MAP_PING_SEND,
      {
        expectedMapId: submission.mapId,
        type: submission.type,
        x: submission.tile.x,
        y: submission.tile.y,
      },
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

  const onMapPingStart = (event: KeyboardEvent | MouseEvent) => {
    if (
      !isNewInterface ||
      !areMapPingsEnabled() ||
      !socket ||
      !connected ||
      !joined
    ) {
      return false;
    }

    const trigger = resolveTrigger(event);
    const mapId = Game.map.id;
    if (!trigger || !Number.isInteger(mapId)) {
      return false;
    }

    return mapPingInteractionController.begin({
      identity: createMapPingPressIdentity(event),
      mapId,
      origin: trigger.origin,
      tile: trigger.tile,
    });
  };

  const onMapPingEnd = (event: KeyboardEvent | MouseEvent) => {
    const submission = mapPingInteractionController.complete(
      createMapPingPressIdentity(event),
    );
    if (submission) {
      sendMapPing(submission);
    }
  };

  const onMapPingCancel = () => {
    mapPingInteractionController.cancel();
  };

  return {
    onMapPingCancel,
    onMapPingEnd,
    onMapPingStart,
  };
};
