import type { GatewayEvent } from "@/config/gateway";
import type { AppSocket } from "@/lib/socket";
import { useEffect, useRef } from "react";

type SocketWithListeners = Pick<AppSocket, "on" | "off">;

type BufferedSocketIngressBaseOptions<TPayload> = {
  socket: SocketWithListeners | null;
  connected: boolean;
  accountId: string | null | undefined;
  isReady: boolean;
  event: GatewayEvent;
  onProcessBatch: (payloads: readonly TPayload[]) => void;
  maxPendingItems?: number;
};

type BufferedSocketIngressWithoutCancel = {
  cancelEvent?: undefined;
  onCancel?: undefined;
  getPayloadId?: undefined;
  getCancelId?: undefined;
  maxPendingCancels?: undefined;
};

type BufferedSocketIngressWithCancel<TPayload, TCancelPayload> = {
  cancelEvent: GatewayEvent;
  onCancel: (payload: TCancelPayload) => void;
  getPayloadId: (payload: TPayload) => string;
  getCancelId: (payload: TCancelPayload) => string;
  maxPendingCancels?: number;
};

type UseBufferedSocketIngressOptions<TPayload, TCancelPayload> =
  BufferedSocketIngressBaseOptions<TPayload> &
    (
      | BufferedSocketIngressWithoutCancel
      | BufferedSocketIngressWithCancel<TPayload, TCancelPayload>
    );

const DEFAULT_MAX_PENDING_ITEMS = 100;
const DEFAULT_MAX_PENDING_CANCELS = 100;

export const useBufferedSocketIngress = <TPayload, TCancelPayload = never>({
  socket,
  connected,
  accountId,
  isReady,
  event,
  onProcessBatch,
  maxPendingItems = DEFAULT_MAX_PENDING_ITEMS,
  ...cancelOptions
}: UseBufferedSocketIngressOptions<TPayload, TCancelPayload>) => {
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

  isReadyRef.current = isReady;
  onProcessBatchRef.current = onProcessBatch;
  onCancelRef.current = cancelOptions.onCancel;
  getPayloadIdRef.current = cancelOptions.getPayloadId;
  getCancelIdRef.current = cancelOptions.getCancelId;

  const processPayloadsRef = useRef<(payloads: readonly TPayload[]) => void>(
    () => undefined,
  );
  processPayloadsRef.current = (payloads) => {
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
  const flushPendingItemsRef = useRef<() => void>(() => undefined);
  flushPendingItemsRef.current = () => {
    if (!isReadyRef.current || pendingItemsRef.current.length === 0) {
      return;
    }

    const pendingItems = pendingItemsRef.current;
    pendingItemsRef.current = [];
    processPayloadsRef.current(pendingItems);
  };

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

    socket.on(event as never, handleEvent as never);

    return () => {
      socket.off(event as never, handleEvent as never);
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

    socket.on(cancelOptions.cancelEvent as never, handleCancelEvent as never);

    return () => {
      socket.off(
        cancelOptions.cancelEvent as never,
        handleCancelEvent as never,
      );
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
