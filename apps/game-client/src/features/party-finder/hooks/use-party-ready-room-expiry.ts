import { isObjectRecord } from "@lootlog/schema/records";
import { useEffect, useEffectEvent } from "react";
import { useReadyRoomProjections } from "@/features/party-finder/hooks/use-ready-rooms";
import {
  useReadyRoomsCache,
  useRefreshReadyRoom,
} from "@/features/party-finder/hooks/use-ready-rooms-cache";

function hasHttpStatus(cause: unknown, status: number): boolean {
  return isObjectRecord(cause) && cause.status === status;
}

/**
 * A room can lapse without the server sending anything, so each expiry is
 * rechecked against the room itself: a 404 means it is gone, any other
 * response replaces the stale projection.
 */
export function usePartyReadyRoomExpiry(): void {
  const projections = useReadyRoomProjections();
  const { removeProjection } = useReadyRoomsCache();
  const refreshReadyRoom = useRefreshReadyRoom();

  const recheckExpiredRoom = useEffectEvent((notificationId: string) => {
    void refreshReadyRoom(notificationId).catch((cause: unknown) => {
      if (hasHttpStatus(cause, 404)) {
        removeProjection(notificationId);

        return;
      }

      console.warn("Failed to resynchronize expired party Ready Room", cause);
    });
  });

  useEffect(() => {
    const activeProjections = Object.values(projections).filter(
      ({ status }) => status === "ACTIVE",
    );

    if (activeProjections.length === 0) return;

    const nextExpiry = Math.min(
      ...activeProjections.map(({ expiresAt }) => Date.parse(expiresAt)),
    );

    const timeout = window.setTimeout(
      () => {
        const expiredProjections = activeProjections.filter(
          ({ expiresAt }) => Date.parse(expiresAt) <= Date.now(),
        );

        for (const projection of expiredProjections) {
          recheckExpiredRoom(projection.notificationId);
        }
      },
      Math.max(0, nextExpiry - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [projections]);
}
