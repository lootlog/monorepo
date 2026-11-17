import type {
  AppSocketEvent,
  AppSocketEvents,
  AccessUpdate,
} from "@/lib/socket";
import { useEffect, useRef } from "react";

type SocketListenerMethod = <Event extends AppSocketEvent>(
  event: Event,
  listener: (payload: AppSocketEvents[Event]) => void,
) => void;

type SocketWithListeners = {
  on: SocketListenerMethod;
  off: SocketListenerMethod;
};

type BufferedSocketIngressBaseOptions<Event extends AppSocketEvent> = {
  socket: SocketWithListeners | null;
  connected: boolean;
  accountId: string | null | undefined;
  isReady: boolean;
  event: Event;
  onProcessBatch: (payloads: readonly AppSocketEvents[Event][]) => void;
  maxPendingItems?: number;
  isPayloadAllowed?: (payload: AppSocketEvents[Event]) => boolean;
};

type BufferedSocketIngressWithoutCancel = {
  cancelEvent?: undefined;
  onCancel?: undefined;
  getPayloadId?: undefined;
  getCancelId?: undefined;
  maxPendingCancels?: undefined;
};

type BufferedSocketIngressWithCancel<
  Event extends AppSocketEvent,
  CancelEvent extends AppSocketEvent,
> = {
  cancelEvent: CancelEvent;
  onCancel: (payload: AppSocketEvents[CancelEvent]) => void;
  getPayloadId: (payload: AppSocketEvents[Event]) => string;
  getCancelId: (payload: AppSocketEvents[CancelEvent]) => string;
  maxPendingCancels?: number;
};

type UseBufferedSocketIngressOptions<
  Event extends AppSocketEvent,
  CancelEvent extends AppSocketEvent,
> = BufferedSocketIngressBaseOptions<Event> &
  (
    | BufferedSocketIngressWithoutCancel
    | BufferedSocketIngressWithCancel<Event, CancelEvent>
  );

const DEFAULT_MAX_PENDING_ITEMS = 100;

const DEFAULT_MAX_PENDING_CANCELS = 100;

export const useBufferedSocketIngress = <
  Event extends AppSocketEvent,
  CancelEvent extends AppSocketEvent = never,
>({
  socket,
  connected,
  accountId,
  isReady,
  event,
  onProcessBatch,
  maxPendingItems = DEFAULT_MAX_PENDING_ITEMS,
  isPayloadAllowed,
  ...cancelOptions
}: UseBufferedSocketIngressOptions<Event, CancelEvent>) => {
  type TPayload = AppSocketEvents[Event];

  type TCancelPayload = AppSocketEvents[CancelEvent];

  const isPayloadAllowedRef = useRef(isPayloadAllowed);
  const isReadyRef = useRef(isReady);
  const onProcessBatchRef = useRef(onProcessBatch);
  const onCancelRef = useRef(cancelOptions.onCancel);
  const getPayloadIdRef = useRef(cancelOptions.getPayloadId);
  const getCancelIdRef = useRef(cancelOptions.getCancelId);
  const pendingItemsRef = useRef<TPayload[]>([]);
  const pendingCancelIdsRef = useRef<Set<string>>(new Set());
  const previousAccountIdRef = useRef<string | null>(accountId ?? null);
  const flushScheduledRef = useRef(false);
  const listenerGenerationRef = useRef(0);

  const processPayloadsRef = useRef<(payloads: readonly TPayload[]) => void>(
    () => undefined,
  );

  const flushPendingItemsRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    isReadyRef.current = isReady;
    isPayloadAllowedRef.current = isPayloadAllowed;
    onProcessBatchRef.current = onProcessBatch;
    onCancelRef.current = cancelOptions.onCancel;
    getPayloadIdRef.current = cancelOptions.getPayloadId;
    getCancelIdRef.current = cancelOptions.getCancelId;
    processPayloadsRef.current = (input) => {
      const payloads = input.filter(
        (payload) => isPayloadAllowedRef.current?.(payload) ?? true,
      );

      if (payloads.length === 0) return;
      const getPayloadId = getPayloadIdRef.current;

      if (!getPayloadId) {
        onProcessBatchRef.current(payloads);

        return;
      }

      const acceptedPayloads = payloads.filter((payload) => {
        const payloadId = getPayloadId(payload);

        if (pendingCancelIdsRef.current.has(payloadId)) {
          pendingCancelIdsRef.current.delete(payloadId);

          return false;
        }

        return true;
      });

      if (acceptedPayloads.length > 0) {
        onProcessBatchRef.current(acceptedPayloads);
      }
    };

    flushPendingItemsRef.current = () => {
      if (!isReadyRef.current || pendingItemsRef.current.length === 0) {
        return;
      }

      const pendingItems = pendingItemsRef.current;
      pendingItemsRef.current = [];
      processPayloadsRef.current(pendingItems);
    };
  });

  useEffect(() => {
    if (
      previousAccountIdRef.current !== null &&
      previousAccountIdRef.current !== accountId
    ) {
      pendingItemsRef.current = [];
      pendingCancelIdsRef.current.clear();
    }

    previousAccountIdRef.current = accountId ?? null;
  }, [accountId]);

  useEffect(() => {
    const handlePermissionsUpdated = (data?: AccessUpdate) => {
      // A disconnect carries no access update and drops everything pending.
      if (data && isPayloadAllowedRef.current) {
        pendingItemsRef.current = pendingItemsRef.current.filter(
          isPayloadAllowedRef.current,
        );

        return;
      }

      pendingItemsRef.current = [];
      pendingCancelIdsRef.current.clear();
    };

    socket?.on("access.updated", handlePermissionsUpdated);
    socket?.on("disconnect", handlePermissionsUpdated);

    return () => {
      socket?.off("access.updated", handlePermissionsUpdated);
      socket?.off("disconnect", handlePermissionsUpdated);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !connected) {
      return;
    }

    const listenerGeneration = listenerGenerationRef.current + 1;
    listenerGenerationRef.current = listenerGeneration;

    const handleEvent = (payload: TPayload) => {
      if (pendingItemsRef.current.length >= maxPendingItems) {
        pendingItemsRef.current.shift();
      }

      pendingItemsRef.current.push(payload);

      if (!isReadyRef.current || flushScheduledRef.current) {
        return;
      }

      flushScheduledRef.current = true;
      queueMicrotask(() => {
        flushScheduledRef.current = false;

        if (listenerGenerationRef.current !== listenerGeneration) {
          return;
        }

        flushPendingItemsRef.current();
      });
    };

    socket.on(event, handleEvent);

    return () => {
      socket.off(event, handleEvent);

      if (listenerGenerationRef.current === listenerGeneration) {
        listenerGenerationRef.current += 1;
        flushScheduledRef.current = false;
      }
    };
  }, [connected, event, maxPendingItems, socket]);

  useEffect(() => {
    if (
      !cancelOptions.cancelEvent ||
      !cancelOptions.onCancel ||
      !socket ||
      !connected
    ) {
      return;
    }

    const maxPendingCancels =
      cancelOptions.maxPendingCancels ?? DEFAULT_MAX_PENDING_CANCELS;

    const handleCancelEvent = (payload: TCancelPayload) => {
      const getCancelId = getCancelIdRef.current;

      if (!getCancelId) {
        return;
      }

      const cancelId = getCancelId(payload);

      if (!isReadyRef.current) {
        if (pendingCancelIdsRef.current.size >= maxPendingCancels) {
          const oldestPendingCancelId = pendingCancelIdsRef.current
            .values()
            .next().value;

          if (oldestPendingCancelId) {
            pendingCancelIdsRef.current.delete(oldestPendingCancelId);
          }
        }

        pendingCancelIdsRef.current.add(cancelId);

        const getPayloadId = getPayloadIdRef.current;

        if (getPayloadId) {
          pendingItemsRef.current = pendingItemsRef.current.filter(
            (pendingItem) => getPayloadId(pendingItem) !== cancelId,
          );
        }

        return;
      }

      flushPendingItemsRef.current();
      onCancelRef.current?.(payload);
    };

    socket.on(cancelOptions.cancelEvent, handleCancelEvent);

    return () => {
      socket.off(cancelOptions.cancelEvent, handleCancelEvent);
    };
  }, [
    cancelOptions.cancelEvent,
    cancelOptions.maxPendingCancels,
    cancelOptions.onCancel,
    connected,
    socket,
  ]);

  useEffect(() => {
    if (!isReady || pendingItemsRef.current.length === 0) {
      return;
    }

    flushPendingItemsRef.current();
  }, [isReady]);
};
