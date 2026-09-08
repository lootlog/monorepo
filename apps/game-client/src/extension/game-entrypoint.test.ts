import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReactDOM from "react-dom/client";
import entrypoint from "../../extension/entrypoints/game.content";
// SAFETY: game.content.ts defines main() with no parameters. WXT widens that
// declaration to a context-taking SDK signature; this MAIN-world entry never reads a context.
const start = entrypoint.main as () => void;
import { bootstrapGameClient, type GameClientRuntime } from "@/bootstrap";
import { encodeMessage } from "./protocol";

const runtimeWindow: Window & {
  __lootlogGameClientRuntime?: GameClientRuntime;
} = window;
const channels: TestMessageChannel[] = [];
const NativeMessageChannel = MessageChannel;
class TestMessageChannel extends NativeMessageChannel {
  closePort = vi.spyOn(this.port1, "close");
  constructor() {
    super();
    channels.push(this);
  }
}
const channel = () => {
  const latest = channels.at(-1);
  if (!latest) throw new Error("No extension channel allocated");
  return latest;
};
const closeBackground = () => {
  const port = channel().port1;
  port.onmessage?.call(
    port,
    new MessageEvent("message", { data: encodeMessage({ type: "closed" }) }),
  );
};

beforeEach(() => {
  vi.stubGlobal("location", new URL("https://fobos.margonem.pl/"));
  vi.stubGlobal("MessageChannel", TestMessageChannel);
  vi.spyOn(window, "postMessage").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(null));
});
afterEach(() => {
  window.dispatchEvent(new Event("pagehide"));
  runtimeWindow.__lootlogGameClientRuntime?.dispose();
  delete runtimeWindow.__lootlogGameClientRuntime;
  for (const current of channels.splice(0)) {
    current.port1.close();
    current.port2.close();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("extension game entrypoint cleanup", () => {
  it("releases its transport and preserves a root creation failure", () => {
    const failure = new Error("startup failed");
    vi.spyOn(ReactDOM, "createRoot").mockImplementationOnce(() => {
      throw failure;
    });
    vi.spyOn(window, "postMessage").mockImplementationOnce(() => {
      channel().closePort.mockImplementationOnce(() => {
        throw new Error("port cleanup failed");
      });
    });
    expect(start).toThrow(failure);
    expect(channel().closePort).toHaveBeenCalledOnce();
    expect(runtimeWindow.__lootlogGameClientRuntime).toBeUndefined();
  });

  it("releases the newly allocated transport when replacing the previous runtime fails", () => {
    const previous = bootstrapGameClient();
    const failure = new Error("previous runtime cleanup failed");
    const unmount = previous.root.unmount.bind(previous.root);
    vi.spyOn(previous.root, "unmount").mockImplementationOnce(() => {
      unmount();
      throw failure;
    });
    const createRoot = vi.spyOn(ReactDOM, "createRoot");
    expect(start).toThrow(failure);
    expect(createRoot).not.toHaveBeenCalled();
    expect(channel().closePort).toHaveBeenCalledOnce();
    expect(previous.state).toBe("disposed");
  });

  it("cleans up on pagehide and ignores a subsequent channel close", () => {
    start();
    const runtime = runtimeWindow.__lootlogGameClientRuntime;
    if (!runtime) throw new Error("Runtime not started");
    const dispose = vi.spyOn(runtime, "dispose");
    window.dispatchEvent(new Event("pagehide"));
    closeBackground();
    expect(dispose).toHaveBeenCalledOnce();
    expect(channel().closePort).toHaveBeenCalledOnce();
    expect(runtime.state).toBe("disposed");
    expect(window.lootlogGameClientApi).toBeUndefined();
  });

  it("releases transport despite runtime cleanup failure and never cleans twice", () => {
    start();
    const runtime = runtimeWindow.__lootlogGameClientRuntime;
    if (!runtime) throw new Error("Runtime not started");
    const failure = new Error("runtime cleanup failed");
    const unmount = runtime.root.unmount.bind(runtime.root);
    const dispose = vi
      .spyOn(runtime.root, "unmount")
      .mockImplementationOnce(() => {
        unmount();
        throw failure;
      });
    // The real transport isolates errors thrown by its closed callback.
    expect(closeBackground).not.toThrow();
    expect(channel().closePort).toHaveBeenCalledOnce();
    expect(closeBackground).not.toThrow();
    window.dispatchEvent(new Event("pagehide"));
    expect(dispose).toHaveBeenCalledOnce();
    expect(channel().closePort).toHaveBeenCalledOnce();
  });

  it("handles a channel closing before connect returns without starting a runtime", () => {
    vi.spyOn(window, "postMessage").mockImplementationOnce(closeBackground);
    const createRoot = vi.spyOn(ReactDOM, "createRoot");
    expect(start).not.toThrow();
    expect(createRoot).not.toHaveBeenCalled();
    expect(channel().closePort).toHaveBeenCalledOnce();
  });

  it("disposes a runtime returned after the channel closes during bootstrap", () => {
    const createRoot = ReactDOM.createRoot.bind(ReactDOM);
    vi.spyOn(ReactDOM, "createRoot").mockImplementationOnce((...args) => {
      const root = createRoot(...args);
      closeBackground();
      return root;
    });
    start();
    expect(runtimeWindow.__lootlogGameClientRuntime).toBeUndefined();
    expect(window.lootlogGameClientApi).toBeUndefined();
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(channel().closePort).toHaveBeenCalledOnce();
  });
});
