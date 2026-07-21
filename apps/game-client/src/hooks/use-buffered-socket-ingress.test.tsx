import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useBufferedSocketIngress } from "@/hooks/use-buffered-socket-ingress";

type FakeSocket = {
  on: (event: string, handler: (payload: unknown) => void) => void;
  off: (event: string, handler: (payload: unknown) => void) => void;
};

const handlersByEvent = new Map<string, (payload: unknown) => void>();

const socket: FakeSocket = {
  on: vi.fn((event: string, handler: (payload: unknown) => void) => {
    handlersByEvent.set(event, handler);
  }),
  off: vi.fn((event: string) => {
    handlersByEvent.delete(event);
  }),
};

const processPayloadBatch = vi.fn();
const cancelPayload = vi.fn();

const emit = (event: GatewayEvent, payload: unknown) => {
  handlersByEvent.get(event)?.(payload);
};

describe("useBufferedSocketIngress", () => {
  beforeEach(() => {
    handlersByEvent.clear();
    vi.mocked(socket.on).mockClear();
    vi.mocked(socket.off).mockClear();
    processPayloadBatch.mockReset();
    cancelPayload.mockReset();
  });

  it("queues payloads until readiness and flushes them afterwards", () => {
    const { rerender } = renderHook(
      ({ isReady }) =>
        useBufferedSocketIngress({
          socket: socket as never,
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
    const { rerender } = renderHook(
      ({ accountId, isReady }) =>
        useBufferedSocketIngress({
          socket: socket as never,
          connected: true,
          accountId,
          isReady,
          event: GatewayEvent.NOTIFICATION,
          onProcessBatch: processPayloadBatch,
        }),
      {
        initialProps: {
          accountId: null as string | null,
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
          socket: socket as never,
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
        socket: socket as never,
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
        socket: socket as never,
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
        socket: socket as never,
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
        socket: socket as never,
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
          socket: socket as never,
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
