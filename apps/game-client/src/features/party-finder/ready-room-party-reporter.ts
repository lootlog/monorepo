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
  PARTY_OBSERVATION_HEARTBEAT_MS,
  type PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";

type ObservePartyBody = Parameters<
  typeof partyReadyRoomControllerObserveParty
>[1];

export type ReadyRoomPartyObservation = {
  scope: string;
  notificationId: string;
  body: ObservePartyBody &
    Required<Pick<ObservePartyBody, "expectedRevision" | "members">>;
};

type PendingObservation = {
  observation: ReadyRoomPartyObservation;
  key: string;
  attempts: number;
  reported: boolean;
  sentAt: number;
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
  let heartbeatTimer: ReturnType<typeof setTimeout> | undefined;

  function clearTimers() {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    clearTimeout(heartbeatTimer);
    heartbeatTimer = undefined;
  }

  function refreshObservation() {
    const observation = readObservation();

    // Display fields belong to the key; HP and the room revision do not.
    const key = observation
      ? JSON.stringify([observation.scope, observation.body.members])
      : null;

    if (pending?.key === key && observation) {
      pending.observation = observation;

      return;
    }

    clearTimers();
    pending =
      observation && key !== null
        ? { observation, key, attempts: 0, reported: false, sentAt: 0 }
        : null;
  }

  // Viewers mark an observation stale after a fixed age, so re-report an
  // unchanged party a heartbeat after the last report was sent.
  function scheduleHeartbeat(current: PendingObservation) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(
      () => {
        heartbeatTimer = undefined;

        if (pending !== current) return;

        current.attempts = 0;
        current.reported = false;
        flush();
      },
      Math.max(0, current.sentAt + PARTY_OBSERVATION_HEARTBEAT_MS - Date.now()),
    );
  }

  // Responses for the same room scope are server truth and carry its newest
  // revision, even when a newer roster has superseded the reported one.
  function isCurrentScope(current: PendingObservation) {
    return pending?.observation.scope === current.observation.scope;
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

        if (!isCurrentScope(current)) return;

        mergeProjection(projection);
        refreshObservation();

        if (pending !== current) return;
      }

      current.sentAt = Date.now();

      const projection = decodePartyReadyRoomProjection(
        await partyReadyRoomControllerObserveParty(
          { notificationId: current.observation.notificationId },
          current.observation.body,
          { apiClient: { timeoutMs: READY_ROOM_PARTY_REQUEST_TIMEOUT_MS } },
        ),
      );

      if (disposed) return;
      refreshObservation();

      if (!isCurrentScope(current)) return;

      if (pending === current) {
        current.reported = true;
        scheduleHeartbeat(current);
      }

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

      if (!revisionConflict && !isRetryableApiFailure(cause)) {
        current.attempts = RETRY_DELAYS_MS.length + 1;

        return;
      }

      if (delay === undefined) {
        scheduleHeartbeat(current);

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
      clearTimers();
    },
  };
}
