import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReactDOM from "react-dom/client";
import { RealtimeClient } from "@lootlog/client/realtime";
import {
  bootstrapGameClient,
  getLootlogRootZIndex,
  type GameClientRuntime,
} from "./bootstrap";
import { queryClient } from "@/lib/query-client";
import { useChatStore } from "@/store/chat.store";
import { getGameClientPlatform } from "@/lib/game-client-platform";
import * as apiModule from "@/lib/configure-api-clients";

type RuntimeWindow = Window & {
  __lootlogGameClientRuntime?: GameClientRuntime;
};
const runtimeWindow: RuntimeWindow = window;
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(null));
});
afterEach(() => {
  runtimeWindow.__lootlogGameClientRuntime?.dispose();
  delete runtimeWindow.__lootlogGameClientRuntime;
  document.getElementById("lootlog-root")?.remove();
  document.cookie = "interface=; Max-Age=0";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getLootlogRootZIndex", () => {
  it.each([
    { cookie: "si", expected: 449 },
    { cookie: "ni", expected: 11 },
    { cookie: null, expected: 11 },
  ])("uses the native cookie value $cookie", ({ cookie, expected }) => {
    vi.stubGlobal("getCookie", () => cookie);
    expect(getLootlogRootZIndex()).toBe(expected);
  });
  it("reads document.cookie when the native cookie reader is unavailable", () => {
    document.cookie = "interface=si";
    expect(getLootlogRootZIndex()).toBe(449);
  });
});

describe("game client startup", () => {
  it("creates one root and public API, clears private state on disposal, and can restart", async () => {
    const createRoot = vi.spyOn(ReactDOM, "createRoot");
    await import("./main");
    const first = bootstrapGameClient();
    const publicApi = window.lootlogGameClientApi;
    const second = bootstrapGameClient();
    expect(first).toBe(second);
    expect(window.lootlogGameClientApi).toBe(publicApi);
    expect(publicApi?.apiVersion).toBe(1);
    expect(createRoot).toHaveBeenCalledOnce();
    expect(document.querySelectorAll("#lootlog-root")).toHaveLength(1);
    queryClient.setQueryData(["private-test"], { secret: "old session" });
    useChatStore.getState().setReplyDraft({
      guildId: "guild",
      messageId: "id",
      senderNick: "Player",
      message: "Private reply",
      type: "NORMAL",
    });
    const unmount = vi.spyOn(first.root, "unmount");
    first.dispose();
    second.dispose();
    expect(unmount).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(["private-test"])).toBeUndefined();
    expect(useChatStore.getState().replyDraft).toBeNull();
    expect(window.lootlogGameClientApi).toBeUndefined();
    expect(document.getElementById("lootlog-root")).toBeNull();
    const restarted = bootstrapGameClient();
    expect(restarted).not.toBe(first);
    expect(createRoot).toHaveBeenCalledTimes(2);
    expect(window.lootlogGameClientApi?.apiVersion).toBe(1);
  });

  it("disposes an older version before starting the current one", () => {
    const previous = bootstrapGameClient();
    previous.version = "older-version";
    const dispose = vi.spyOn(previous, "dispose");
    const current = bootstrapGameClient();
    expect(dispose).toHaveBeenCalledOnce();
    expect(previous.state).toBe("disposed");
    expect(current).not.toBe(previous);
    expect(current.version).not.toBe("older-version");
  });

  it("lets the extension replace the userscript, then preserves it on userscript reload", () => {
    const userscript = bootstrapGameClient();
    const extension = bootstrapGameClient({
      fetch: globalThis.fetch,
      createRealtime: () =>
        new RealtimeClient({ url: "https://gateway.lootlog.pl" }),
    });
    expect(extension.version).toBe(userscript.version);
    expect(extension.installation).toBe("extension");
    expect(userscript.state).toBe("disposed");
    expect(extension.state).toBe("ready");
    expect(bootstrapGameClient()).toBe(extension);
    expect(document.querySelectorAll("#lootlog-root")).toHaveLength(1);
  });

  it("finishes disposal after failures and reports only the first error once", () => {
    const runtime = bootstrapGameClient();
    const first = new Error("unmount failed");
    const realUnmount = runtime.root.unmount.bind(runtime.root);
    const unmount = vi
      .spyOn(runtime.root, "unmount")
      .mockImplementationOnce(() => {
        realUnmount();
        throw first;
      });
    const realClear = queryClient.clear.bind(queryClient);
    vi.spyOn(queryClient, "clear").mockImplementationOnce(() => {
      realClear();
      throw new Error("cache cleanup failed");
    });
    expect(() => runtime.dispose()).toThrow(first);
    expect(window.lootlogGameClientApi).toBeUndefined();
    expect(runtime.state).toBe("disposed");
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(runtimeWindow.__lootlogGameClientRuntime).toBeUndefined();
    expect(() => runtime.dispose()).not.toThrow();
    expect(unmount).toHaveBeenCalledOnce();
  });

  it("preserves the render error even if unmount also fails", () => {
    const original = new Error("render failed");
    const createRoot = ReactDOM.createRoot.bind(ReactDOM);
    vi.spyOn(ReactDOM, "createRoot").mockImplementation((...args) => {
      const root = createRoot(...args);
      vi.spyOn(root, "render").mockImplementationOnce(() => {
        throw original;
      });
      const unmount = root.unmount.bind(root);
      vi.spyOn(root, "unmount").mockImplementationOnce(() => {
        unmount();
        throw new Error("unmount failed");
      });
      return root;
    });
    expect(() => bootstrapGameClient()).toThrow(original);
    expect(window.lootlogGameClientApi).toBeUndefined();
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(runtimeWindow.__lootlogGameClientRuntime).toBeUndefined();
  });

  it("restores the previous platform when configuration fails before root allocation", () => {
    const previous = getGameClientPlatform();
    const failure = new Error("client configuration failed");
    vi.spyOn(apiModule, "configureGameApiClients").mockImplementationOnce(
      () => {
        throw failure;
      },
    );
    expect(() =>
      bootstrapGameClient({
        fetch: globalThis.fetch,
        createRealtime: () =>
          new RealtimeClient({ url: "https://gateway.lootlog.pl" }),
      }),
    ).toThrow(failure);
    expect(getGameClientPlatform()).toBe(previous);
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(runtimeWindow.__lootlogGameClientRuntime).toBeUndefined();
  });

  it("removes the allocated root when the native window refuses public API exposure", () => {
    const failure = new Error("public API exposure failed");
    const defineProperty = Object.defineProperty;
    vi.spyOn(Object, "defineProperty").mockImplementation(
      (target, property, attributes) => {
        if (target === window && property === "lootlogGameClientApi")
          throw failure;
        return defineProperty(target, property, attributes);
      },
    );
    expect(() => bootstrapGameClient()).toThrow(failure);
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(runtimeWindow.__lootlogGameClientRuntime).toBeUndefined();
  });

  it("removes the allocated element when React root creation fails", () => {
    const failure = new Error("React root creation failed");
    vi.spyOn(ReactDOM, "createRoot").mockImplementationOnce(() => {
      throw failure;
    });
    expect(() => bootstrapGameClient()).toThrow(failure);
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(window.lootlogGameClientApi).toBeUndefined();
    expect(runtimeWindow.__lootlogGameClientRuntime).toBeUndefined();
  });
});
