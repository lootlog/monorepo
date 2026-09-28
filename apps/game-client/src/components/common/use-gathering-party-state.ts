import { useEffect, useState } from "react";
import {
  PARTY_OBSERVATION_FRESHNESS_MS,
  type PartyGatheringSummary,
} from "@lootlog/schema/party-ready-room";
import { useGlobalStore } from "@/store/global.store";

export function useGatheringPartyState(
  partyState: PartyGatheringSummary["partyState"],
  stale = false,
) {
  const joined = useGlobalStore((state) => state.socketState.joined);
  const [now, setNow] = useState(Date.now);
  const observation = partyState?.status === "OBSERVED" ? partyState : null;

  const expiresAt = observation
    ? Date.parse(observation.observedAt) + PARTY_OBSERVATION_FRESHNESS_MS
    : null;

  useEffect(() => {
    if (expiresAt === null || !Number.isFinite(expiresAt)) return;

    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, expiresAt - Date.now()),
    );

    return () => window.clearTimeout(timeout);
  }, [expiresAt]);

  return {
    observation,
    isStale:
      stale ||
      !joined ||
      expiresAt === null ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now,
  };
}
