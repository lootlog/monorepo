import { partyReadyRoomControllerObserveParty } from "@lootlog/client/main";
import { isRetryableApiFailure } from "@lootlog/client/transport";
import {
  decodePartyReadyRoomProjection,
  type PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";

export type ReadyRoomPartyObservation = {
  scope: string;
  notificationId: string;
  body: Parameters<typeof partyReadyRoomControllerObserveParty>[1];
};

type PendingObservation = {
  observation: ReadyRoomPartyObservation;
  key: string;
  attempts: number;
  reported: boolean;
};

const RETRY_DELAYS_MS = [1_000, 2_000];

// Remounting the observer must not overlap a POST that can still commit.
let activeReport: Promise<void> | null = null;

export function createReadyRoomPartyReporter(
  readObservation: () => ReadyRoomPartyObservation | null,
  mergeProjection: (projection: PartyReadyRoomProjection) => void,
) {
  let pending: PendingObservation | null = null;
  let waitingForReport = false;
  let disposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function clearRetry() {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  function refreshObservation() {
    const observation = readObservation();

    const key = observation
      ? JSON.stringify([observation.scope, observation.body.memberCharacterIds])
      : null;

    if (pending?.key === key) return;
    clearRetry();
    pending =
      observation && key !== null
        ? { observation, key, attempts: 0, reported: false }
        : null;
  }

  async function report(current: PendingObservation) {
    current.attempts += 1;

    try {
      const projection = decodePartyReadyRoomProjection(
        await partyReadyRoomControllerObserveParty(
          { notificationId: current.observation.notificationId },
          current.observation.body,
        ),
      );

      if (disposed) return;
      refreshObservation();

      if (pending !== current) return;

      current.reported = true;
      mergeProjection(projection);
    } catch (cause) {
      if (disposed) return;
      refreshObservation();

      if (pending !== current) return;

      console.warn("Failed to report the observed party snapshot", cause);
      const delay = RETRY_DELAYS_MS[current.attempts - 1];

      if (delay === undefined || !isRetryableApiFailure(cause)) {
        current.attempts = RETRY_DELAYS_MS.length + 1;

        return;
      }

      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        flush();
      }, delay);
    }
  }

  function flush() {
    if (disposed) return;
    refreshObservation();

    if (
      waitingForReport ||
      retryTimer !== undefined ||
      !pending ||
      pending.reported ||
      pending.attempts > RETRY_DELAYS_MS.length
    )
      return;

    if (activeReport) {
      waitingForReport = true;
      void activeReport.then(() => {
        waitingForReport = false;
        flush();
      });

      return;
    }

    // The endpoint replaces presence without a client revision. Wait for each
    // request to settle before sending the latest roster, including scope changes.
    const request = report(pending);
    activeReport = request;
    void request.then(() => {
      activeReport = null;
      flush();
    });
  }

  return {
    flush,
    dispose() {
      disposed = true;
      clearRetry();
    },
  };
}
