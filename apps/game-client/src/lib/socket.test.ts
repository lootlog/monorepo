import { afterEach, describe, expect, it, vi } from "vitest";
import { disposeSocket, getSocket } from "./socket";

describe("realtime socket facade lifecycle", () => {
  afterEach(() => disposeSocket());

  it("creates at most one active facade", () => {
    expect(getSocket()).toBe(getSocket());
  });

  it("fully disposes the singleton before creating a replacement", () => {
    const firstSocket = getSocket();
    const disconnect = vi.spyOn(firstSocket, "disconnect");
    const removeAllListeners = vi.spyOn(firstSocket, "removeAllListeners");

    disposeSocket();
    const secondSocket = getSocket();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeAllListeners).toHaveBeenCalledOnce();
    expect(secondSocket).not.toBe(firstSocket);
  });
});
