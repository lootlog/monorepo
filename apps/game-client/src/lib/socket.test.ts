import { afterEach, describe, expect, it, vi } from "vitest";

const socketMocks = vi.hoisted(() => ({
  createdSockets: [] as {
    disconnect: ReturnType<typeof vi.fn>;
    removeAllListeners: ReturnType<typeof vi.fn>;
  }[],
  io: vi.fn(() => {
    const createdSocket = {
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    socketMocks.createdSockets.push(createdSocket);
    return createdSocket;
  }),
}));

vi.mock("socket.io-client", () => ({ io: socketMocks.io }));
vi.mock("@/lib/dev-permission-override", () => ({
  getSerializedDevPermissionOverride: () => undefined,
}));

import { disposeSocket, getSocket } from "./socket";

describe("socket lifecycle", () => {
  afterEach(() => {
    disposeSocket();
    socketMocks.createdSockets.length = 0;
    socketMocks.io.mockClear();
  });

  it("creates at most one active socket", () => {
    expect(getSocket()).toBe(getSocket());
    expect(socketMocks.io).toHaveBeenCalledOnce();
  });

  it("fully disposes the singleton before creating a replacement", () => {
    const firstSocket = getSocket();

    disposeSocket();
    const secondSocket = getSocket();

    expect(firstSocket.disconnect).toHaveBeenCalledOnce();
    expect(firstSocket.removeAllListeners).toHaveBeenCalledOnce();
    expect(secondSocket).not.toBe(firstSocket);
    expect(socketMocks.io).toHaveBeenCalledTimes(2);
  });
});
