import { RealtimeEventListeners } from "@lootlog/client/realtime/event-listeners";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useBufferedSocketIngress } from "@/hooks/use-buffered-socket-ingress";

const listeners = new RealtimeEventListeners<GatewayEvent>();
const socket = {
  on: listeners.add.bind(listeners),
  off: listeners.delete.bind(listeners),
};
const emit = listeners.emit.bind(listeners);
const processPayloadBatch =
  vi.fn<(payloads: readonly { notificationId: string }[]) => void>();
const cancelPayload = vi.fn<(payload: { notificationId: string }) => void>();

describe("useBufferedSocketIngress", () => {
  beforeEach(() => {
    listeners.clear();
    processPayloadBatch.mockReset();
    cancelPayload.mockReset();
  });

  it("discards notifications buffered before a permission change", async () => {
    const onProcessBatch =
      vi.fn<(payloads: readonly { notificationId: string }[]) => void>();
    renderHook(() =>
      useBufferedSocketIngress({
        socket,
        connected: true,
        accountId: "account-1",
        isReady: true,
        event: GatewayEvent.NOTIFICATION,
        onProcessBatch,
      }),
    );
    emit(GatewayEvent.NOTIFICATION, { notificationId: "hidden-titan" });
    emit(GatewayEvent.PERMISSIONS_UPDATED, {});
    await act(async () => {
      await Promise.resolve();
    });
    expect(onProcessBatch).not.toHaveBeenCalled();
    emit(GatewayEvent.NOTIFICATION, { notificationId: "allowed" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(onProcessBatch).toHaveBeenCalledWith([
      { notificationId: "allowed" },
    ]);
  });

  it("queues payloads until readiness and flushes them afterwards", () => {
    const { rerender } = renderHook(
      ({ isReady }) =>
        useBufferedSocketIngress({
          socket,
          connected: true,
          accountId: null,
          isReady,
          event: GatewayEvent.NOTIFICATION,
          onProcessBatch: processPayloadBatch,
        }),
      {
        initialProps: {
          isReady: false,
        },
      },
    );

    emit(GatewayEvent.NOTIFICATION, { notificationId: "notification-1" });

    expect(processPayloadBatch).not.toHaveBeenCalled();

    rerender({ isReady: true });

    expect(processPayloadBatch).toHaveBeenCalledWith([
      { notificationId: "notification-1" },
    ]);
  });

  it("clears queued payloads after account change before readiness", () => {
    const { rerender } = renderHook<
      void,
      { accountId: string | null; isReady: boolean }
    >(
      ({
        accountId,
        isReady,
      }: {
        accountId: string | null;
        isReady: boolean;
      }) =>
        useBufferedSocketIngress({
          socket,
          connected: true,
          accountId,
          isReady,
          event: GatewayEvent.NOTIFICATION,
          onProcessBatch: processPayloadBatch,
        }),
      {
        initialProps: {
          accountId: null,
          isReady: false,
        },
      },
    );

    emit(GatewayEvent.NOTIFICATION, { notificationId: "notification-1" });

    rerender({
      accountId: "account-1",
      isReady: false,
    });
    rerender({
      accountId: "account-2",
      isReady: false,
    });
    rerender({
      accountId: "account-2",
      isReady: true,
    });

    expect(processPayloadBatch).not.toHaveBeenCalled();
  });

  it("removes queued payloads after a queued cancel event", () => {
    const { rerender } = renderHook(
      ({ isReady }) =>
        useBufferedSocketIngress({
          socket,
          connected: true,
          accountId: null,
          isReady,
          event: GatewayEvent.PARTY_GATHERING_SEND,
          cancelEvent: GatewayEvent.PARTY_GATHERING_CANCEL,
          onProcessBatch: processPayloadBatch,
          onCancel: cancelPayload,
          getPayloadId: (payload: { notificationId: string }) =>
            payload.notificationId,
          getCancelId: (payload: { notificationId: string }) =>
            payload.notificationId,
        }),
      {
        initialProps: {
          isReady: false,
        },
      },
    );

    emit(GatewayEvent.PARTY_GATHERING_SEND, {
      notificationId: "notification-1",
    });
    emit(GatewayEvent.PARTY_GATHERING_CANCEL, {
      notificationId: "notification-1",
    });

    rerender({ isReady: true });

    expect(processPayloadBatch).not.toHaveBeenCalled();
    expect(cancelPayload).not.toHaveBeenCalled();
  });

  it("applies cancel events immediately after readiness", () => {
    renderHook(() =>
      useBufferedSocketIngress({
        socket,
        connected: true,
        accountId: null,
        isReady: true,
        event: GatewayEvent.PARTY_GATHERING_SEND,
        cancelEvent: GatewayEvent.PARTY_GATHERING_CANCEL,
        onProcessBatch: processPayloadBatch,
        onCancel: cancelPayload,
        getPayloadId: (payload: { notificationId: string }) =>
          payload.notificationId,
        getCancelId: (payload: { notificationId: string }) =>
          payload.notificationId,
      }),
    );

    emit(GatewayEvent.PARTY_GATHERING_CANCEL, {
      notificationId: "notification-1",
    });

    expect(cancelPayload).toHaveBeenCalledWith({
      notificationId: "notification-1",
    });
  });

  it("batches ready payloads received during the same task", async () => {
    renderHook(() =>
      useBufferedSocketIngress({
        socket,
        connected: true,
        accountId: "account-1",
        isReady: true,
        event: GatewayEvent.NOTIFICATION,
        onProcessBatch: processPayloadBatch,
      }),
    );

    emit(GatewayEvent.NOTIFICATION, { notificationId: "notification-1" });
    emit(GatewayEvent.NOTIFICATION, { notificationId: "notification-2" });
    emit(GatewayEvent.NOTIFICATION, { notificationId: "notification-3" });

    expect(processPayloadBatch).not.toHaveBeenCalled();
    await act(() => Promise.resolve());
    expect(processPayloadBatch).toHaveBeenCalledTimes(1);
    expect(processPayloadBatch).toHaveBeenCalledWith([
      { notificationId: "notification-1" },
      { notificationId: "notification-2" },
      { notificationId: "notification-3" },
    ]);
  });

  it("does not flush a ready batch after unmount", async () => {
    const { unmount } = renderHook(() =>
      useBufferedSocketIngress({
        socket,
        connected: true,
        accountId: "account-1",
        isReady: true,
        event: GatewayEvent.NOTIFICATION,
        onProcessBatch: processPayloadBatch,
      }),
    );

    emit(GatewayEvent.NOTIFICATION, { notificationId: "notification-1" });
    unmount();
    await act(() => Promise.resolve());

    expect(processPayloadBatch).not.toHaveBeenCalled();
  });

  it("flushes a queued payload before a following ready cancel", () => {
    renderHook(() =>
      useBufferedSocketIngress({
        socket,
        connected: true,
        accountId: "account-1",
        isReady: true,
        event: GatewayEvent.PARTY_GATHERING_SEND,
        cancelEvent: GatewayEvent.PARTY_GATHERING_CANCEL,
        onProcessBatch: processPayloadBatch,
        onCancel: cancelPayload,
        getPayloadId: (payload: { notificationId: string }) =>
          payload.notificationId,
        getCancelId: (payload: { notificationId: string }) =>
          payload.notificationId,
      }),
    );

    emit(GatewayEvent.PARTY_GATHERING_SEND, {
      notificationId: "notification-1",
    });
    emit(GatewayEvent.PARTY_GATHERING_CANCEL, {
      notificationId: "notification-1",
    });

    expect(processPayloadBatch).toHaveBeenCalledWith([
      { notificationId: "notification-1" },
    ]);
    expect(processPayloadBatch.mock.invocationCallOrder[0]).toBeLessThan(
      cancelPayload.mock.invocationCallOrder[0],
    );
  });

  it("flushes the pending queue as one ordered batch", () => {
    const { rerender } = renderHook(
      ({ isReady }) =>
        useBufferedSocketIngress({
          socket,
          connected: true,
          accountId: null,
          isReady,
          event: GatewayEvent.NOTIFICATION,
          onProcessBatch: processPayloadBatch,
        }),
      {
        initialProps: {
          isReady: false,
        },
      },
    );

    for (let index = 0; index < 100; index += 1) {
      emit(GatewayEvent.NOTIFICATION, {
        notificationId: `notification-${index}`,
      });
    }

    rerender({ isReady: true });

    expect(processPayloadBatch).toHaveBeenCalledTimes(1);
    expect(processPayloadBatch.mock.calls[0]?.[0]).toHaveLength(100);
    expect(processPayloadBatch.mock.calls[0]?.[0]?.[0]).toEqual({
      notificationId: "notification-0",
    });
    expect(processPayloadBatch.mock.calls[0]?.[0]?.at(-1)).toEqual({
      notificationId: "notification-99",
    });
  });
});

it("keeps unaffected queued notifications and rejects revoked data at flush", async () => {
  let allowedGuilds = new Set(["a", "b"]);
  const onProcessBatch =
    vi.fn<(payloads: readonly { guildId: string }[]) => void>();
  renderHook(() =>
    useBufferedSocketIngress({
      socket,
      connected: true,
      accountId: "account",
      isReady: true,
      event: GatewayEvent.NOTIFICATION,
      isPayloadAllowed: (payload: { guildId: string }) =>
        allowedGuilds.has(payload.guildId),
      onProcessBatch,
    }),
  );
  emit(GatewayEvent.NOTIFICATION, { guildId: "a" });
  emit(GatewayEvent.NOTIFICATION, { guildId: "b" });
  allowedGuilds = new Set(["b"]);
  emit(GatewayEvent.PERMISSIONS_UPDATED, {
    accessPolicy: { version: "new", organizations: [] },
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(onProcessBatch).toHaveBeenCalledWith([{ guildId: "b" }]);
});
