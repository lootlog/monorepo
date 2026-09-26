import { useSocket } from "@/contexts/socket-context";
import { isBattlePingType } from "@lootlog/schema/battle-ping";
import { isMapPingType } from "@lootlog/schema/map-ping";
import { useEffect, useRef } from "react";
import {
  createPingPressIdentity,
  pingInteractionController,
} from "./ping-interaction-controller";
import { useBattlePings } from "./use-battle-pings";
import { useMapPings, type PingPointer } from "./use-map-pings";

const onPingCancel = () => {
  pingInteractionController.cancel();
};

/**
 * One ping hotkey for both surfaces: a warrior in a turn-based battle, or a
 * tile on the map and the handheld mini map.
 */
export const usePings = () => {
  const { connected, joined } = useSocket();
  const mapPings = useMapPings();
  const battlePings = useBattlePings();
  const pointerRef = useRef<PingPointer | null>(null);
  const active = mapPings.active || battlePings.active;

  // Pointer tracking runs on every mouse move, so it stays off while no ping
  // surface is enabled.
  useEffect(() => {
    if (!active) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      pingInteractionController.updatePointer({
        x: event.clientX,
        y: event.clientY,
      });
      pointerRef.current = {
        target: event.target,
        x: event.clientX,
        y: event.clientY,
      };
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      pointerRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [active]);

  useEffect(() => {
    if (!connected || !joined) {
      pingInteractionController.cancel();
    }
  }, [connected, joined]);

  useEffect(() => onPingCancel, []);

  const onPingStart = (event: KeyboardEvent | MouseEvent) => {
    // A key press pings whatever is under the last known pointer.
    const pointer =
      event instanceof MouseEvent
        ? { target: event.target, x: event.clientX, y: event.clientY }
        : pointerRef.current;

    if (!pointer) {
      return false;
    }

    const start =
      battlePings.resolveStart(pointer) ?? mapPings.resolveStart(pointer);

    return start
      ? pingInteractionController.begin({
          ...start,
          identity: createPingPressIdentity(event),
        })
      : false;
  };

  const onPingEnd = (event: KeyboardEvent | MouseEvent) => {
    const submission = pingInteractionController.complete(
      createPingPressIdentity(event),
    );

    if (!submission) {
      return;
    }

    const { target, type } = submission;

    if (target.kind === "map" && type === "attack" && target.npcId) {
      // Attacking a monster travels as an enemy ping that names the NPC.
      mapPings.send(target.mapId, target.tile, "enemy", target.npcId);
    } else if (target.kind === "map" && isMapPingType(type)) {
      mapPings.send(target.mapId, target.tile, type);
    } else if (target.kind === "battle" && isBattlePingType(type)) {
      battlePings.send(target.warriorId, type);
    }
  };

  return { onPingCancel, onPingEnd, onPingStart };
};
