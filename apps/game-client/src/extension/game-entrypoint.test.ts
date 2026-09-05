import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ bootstrap: vi.fn(), connect: vi.fn() }));
vi.mock("@/bootstrap", () => ({ bootstrapGameClient: mocks.bootstrap }));
vi.mock("@/extension/page-transport", () => ({
  connectPageTransport: mocks.connect,
}));
vi.mock("wxt/utils/define-content-script", () => ({
  defineContentScript: (definition: unknown) => definition,
}));
import entrypoint from "../../extension/entrypoints/game.content";
const runtimeWindow: Window & {
  __lootlogGameClientRuntime?: { dispose: () => void };
} = window;
const start = () => Reflect.apply(entrypoint.main, undefined, []);

describe("extension game entrypoint cleanup", () => {
  const runtimeDispose = vi.fn();
  const transportDispose = vi.fn();
  let onClosed: () => void;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("location", new URL("https://fobos.margonem.pl/"));
    mocks.connect.mockImplementation((callback: () => void) => {
      onClosed = callback;
      return { dispose: transportDispose };
    });
    mocks.bootstrap.mockReturnValue({ dispose: runtimeDispose });
  });
  afterEach(() => {
    window.dispatchEvent(new Event("pagehide"));
    delete runtimeWindow.__lootlogGameClientRuntime;
    vi.unstubAllGlobals();
  });
  it.each(["replacement", "bootstrap"])(
    "releases transport and preserves %s failure",
    (phase) => {
      const failure = new Error("startup failed");
      const fail = () => {
        throw failure;
      };
      if (phase === "replacement")
        runtimeWindow.__lootlogGameClientRuntime = { dispose: fail };
      else mocks.bootstrap.mockImplementation(fail);
      transportDispose.mockImplementation(() => {
        throw new Error("port failed");
      });
      expect(start).toThrow(failure);
      expect(transportDispose).toHaveBeenCalledOnce();
      if (phase === "replacement")
        expect(mocks.bootstrap).not.toHaveBeenCalled();
    },
  );
  it("releases transport despite runtime cleanup failure and never cleans twice", () => {
    const failure = new Error("runtime cleanup failed");
    runtimeDispose.mockImplementation(() => {
      throw failure;
    });
    start();
    expect(() => onClosed()).toThrow(failure);
    expect(transportDispose).toHaveBeenCalledOnce();
    expect(() => onClosed()).not.toThrow();
    window.dispatchEvent(new Event("pagehide"));
    expect(runtimeDispose).toHaveBeenCalledOnce();
    expect(transportDispose).toHaveBeenCalledOnce();
  });
  it("cleans up on pagehide and ignores a subsequent channel close", () => {
    start();
    window.dispatchEvent(new Event("pagehide"));
    onClosed();
    expect(runtimeDispose).toHaveBeenCalledOnce();
    expect(transportDispose).toHaveBeenCalledOnce();
  });
  it("handles channel closing before connect returns without starting runtime", () => {
    mocks.connect.mockImplementation((callback: () => void) => {
      callback();
      return { dispose: transportDispose };
    });
    expect(start).not.toThrow();
    expect(mocks.bootstrap).not.toHaveBeenCalled();
    expect(transportDispose).toHaveBeenCalledOnce();
  });
  it("disposes a runtime returned after the channel closed during bootstrap", () => {
    mocks.bootstrap.mockImplementation(() => {
      onClosed();
      return { dispose: runtimeDispose };
    });
    start();
    expect(runtimeDispose).toHaveBeenCalledOnce();
    expect(transportDispose).toHaveBeenCalledOnce();
  });
});
