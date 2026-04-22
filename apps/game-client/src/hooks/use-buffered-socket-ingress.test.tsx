import { renderHook } from "@testing-library/react";
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

const processPayload = vi.fn();
const cancelPayload = vi.fn();

const emit = (event: GatewayEvent, payload: unknown) => {
  handlersByEvent.get(event)?.(payload);
};

describe("useBufferedSocketIngress", () => {
  beforeEach(() => {
    handlersByEvent.clear();
    vi.mocked(socket.on).mockClear();
    vi.mocked(socket.off).mockClear();
    processPayload.mockReset();
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
          onProcess: processPayload,
        }),
      {
        initialProps: {
          isReady: false,
        },
      },
    );

    emit(GatewayEvent.NOTIFICATION, { notificationId: "notification-1" });

    expect(processPayload).not.toHaveBeenCalled();

    rerender({ isReady: true });

    expect(processPayload).toHaveBeenCalledWith({
      notificationId: "notification-1",
    });
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
          onProcess: processPayload,
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

    expect(processPayload).not.toHaveBeenCalled();
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
          onProcess: processPayload,
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

    expect(processPayload).not.toHaveBeenCalled();
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
        onProcess: processPayload,
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
});
