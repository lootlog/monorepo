import {
  partyReadyRoomControllerGet,
  partyReadyRoomControllerObserveParty,
} from "@lootlog/client/main";
import {
  getApiErrorStatus,
  getApiErrorStringField,
  isRetryableApiFailure,
} from "@lootlog/client/transport";
import {
  decodePartyReadyRoomProjection,
  type PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";

export type ReadyRoomPartyObservation = {
  scope: string;
  notificationId: string;
  body: Parameters<typeof partyReadyRoomControllerObserveParty>[1] & {
    expectedRevision: number;
  };
};

type PendingObservation = {
  observation: ReadyRoomPartyObservation;
  key: string;
  attempts: number;
  reported: boolean;
};

const RETRY_DELAYS_MS = [1_000, 2_000];

export const READY_ROOM_PARTY_REQUEST_TIMEOUT_MS = 5_000;

// Share the bounded request across remounts to avoid unnecessary CAS conflicts.
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

    if (pending?.key === key && observation) {
      pending.observation = observation;

      return;
    }

    clearRetry();
    pending =
      observation && key !== null
        ? { observation, key, attempts: 0, reported: false }
        : null;
  }

  async function report(current: PendingObservation) {
    current.attempts += 1;

    try {
      if (current.attempts > 1) {
        const projection = decodePartyReadyRoomProjection(
          await partyReadyRoomControllerGet(
            { notificationId: current.observation.notificationId },
            { apiClient: { timeoutMs: READY_ROOM_PARTY_REQUEST_TIMEOUT_MS } },
          ),
        );

        if (disposed) return;
        refreshObservation();

        if (pending !== current) return;

        mergeProjection(projection);
        refreshObservation();

        if (pending !== current) return;
      }

      const projection = decodePartyReadyRoomProjection(
        await partyReadyRoomControllerObserveParty(
          { notificationId: current.observation.notificationId },
          current.observation.body,
          { apiClient: { timeoutMs: READY_ROOM_PARTY_REQUEST_TIMEOUT_MS } },
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

      const revisionConflict =
        getApiErrorStatus(cause) === 409 &&
        getApiErrorStringField(cause, "code") === "REVISION_CONFLICT";

      if (
        delay === undefined ||
        (!revisionConflict && !isRetryableApiFailure(cause))
      ) {
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

    // A timeout releases this queue. expectedRevision fences the old server write.
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
