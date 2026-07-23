import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useEffect } from "react";
import { partyReadyRoomControllerGet } from "@lootlog/api-client/react-query/main/party-ready-room";
import { usePartyFinderStore } from "@/store/party-finder.store";

function hasHttpStatus(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === status
  );
}

export function usePartyReadyRoomExpiry(): void {
  const projections = usePartyFinderStore((state) => state.projections);
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const removeProjection = usePartyFinderStore(
    (state) => state.removeProjection,
  );

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
          void partyReadyRoomControllerGet({
            notificationId: projection.notificationId,
          })
            .then((latestProjection) => {
              mergeProjection(
                latestProjection as unknown as PartyReadyRoomProjection,
              );
            })
            .catch((error: unknown) => {
              if (hasHttpStatus(error, 404)) {
                removeProjection(projection.notificationId);
                return;
              }
              console.warn(
                "Failed to resynchronize expired party Ready Room",
                error,
              );
            });
        }
      },
      Math.max(0, nextExpiry - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [projections, mergeProjection, removeProjection]);
}
