import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient } from "@lootlog/client/realtime";

const runtimeMocks = vi.hoisted(() => {
  const render = vi.fn();
  const unmount = vi.fn();
  const teardownPublicApi = vi.fn();
  const clearQueryClient = vi.fn();
  const disposeSoundPlayback = vi.fn();
  const disposeSocket = vi.fn();
  const resetTransientRuntimeState = vi.fn();

  return {
    bootstrapPublicApi: vi.fn(() => teardownPublicApi),
    clearQueryClient,
    createRoot: vi.fn(() => ({ render, unmount })),
    disposeSoundPlayback,
    disposeSocket,
    resetTransientRuntimeState,
    render,
    teardownPublicApi,
    unmount,
  };
});

type RuntimeWindow = Window & {
  __lootlogGameClientRuntime?: {
    dispose: () => void;
    version?: string;
  };
};

const loadMain = () => {
  vi.resetModules();
  return import("./main");
};

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: runtimeMocks.createRoot,
  },
}));

vi.mock("./App", () => ({
  default: () => null,
}));

vi.mock("@/features/public-api", () => ({
  bootstrapPublicApi: runtimeMocks.bootstrapPublicApi,
}));

vi.mock("@/lib/query-client", () => ({
  queryClient: { clear: runtimeMocks.clearQueryClient },
}));

vi.mock("@/lib/sound-playback", () => ({
  disposeSoundPlayback: runtimeMocks.disposeSoundPlayback,
}));

vi.mock("@/lib/socket", () => ({
  disposeSocket: runtimeMocks.disposeSocket,
}));

vi.mock("@/lib/runtime-state", () => ({
  resetTransientRuntimeState: runtimeMocks.resetTransientRuntimeState,
}));

describe("getLootlogRootZIndex", () => {
  afterEach(() => {
    (window as RuntimeWindow).__lootlogGameClientRuntime?.dispose();
    delete (window as RuntimeWindow).__lootlogGameClientRuntime;
    document.getElementById("lootlog-root")?.remove();
    document.cookie = "interface=; Max-Age=0";
    vi.unstubAllGlobals();
    runtimeMocks.bootstrapPublicApi.mockClear();
    runtimeMocks.clearQueryClient.mockClear();
    runtimeMocks.createRoot.mockClear();
    runtimeMocks.disposeSoundPlayback.mockClear();
    runtimeMocks.disposeSocket.mockClear();
    runtimeMocks.resetTransientRuntimeState.mockClear();
    runtimeMocks.render.mockClear();
    runtimeMocks.teardownPublicApi.mockClear();
    runtimeMocks.unmount.mockClear();
    runtimeMocks.bootstrapPublicApi.mockImplementation(
      () => runtimeMocks.teardownPublicApi,
    );
  });

  it("uses z-index 449 for the si interface cookie", async () => {
    vi.stubGlobal(
      "getCookie",
      vi.fn(() => "si"),
    );

    const { getLootlogRootZIndex } = await loadMain();

    expect(getLootlogRootZIndex()).toBe(449);
  });

  it("uses z-index 11 for the ni interface cookie", async () => {
    vi.stubGlobal(
      "getCookie",
      vi.fn(() => "ni"),
    );

    const { getLootlogRootZIndex } = await loadMain();

    expect(getLootlogRootZIndex()).toBe(11);
  });

  it("falls back to z-index 11 when the interface cookie is missing", async () => {
    vi.stubGlobal(
      "getCookie",
      vi.fn(() => null),
    );

    const { getLootlogRootZIndex } = await loadMain();

    expect(getLootlogRootZIndex()).toBe(11);
  });

  it("reads document.cookie when window.getCookie is unavailable", async () => {
    document.cookie = "interface=si";

    const { getLootlogRootZIndex } = await loadMain();

    expect(getLootlogRootZIndex()).toBe(449);
  });

  it("bootstraps one root and disposes the root and public API once", async () => {
    const { bootstrapGameClient } = await loadMain();
    const firstRuntime = bootstrapGameClient();
    const reloadedMain = await loadMain();
    const secondRuntime = reloadedMain.bootstrapGameClient();

    expect(firstRuntime).toBe(secondRuntime);
    expect(runtimeMocks.createRoot).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.createRoot).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
    );
    expect(runtimeMocks.render).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.bootstrapPublicApi).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll("#lootlog-root")).toHaveLength(1);

    firstRuntime.dispose();
    secondRuntime.dispose();

    expect(runtimeMocks.unmount).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.teardownPublicApi).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.clearQueryClient).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.disposeSoundPlayback).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.disposeSocket).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.resetTransientRuntimeState).toHaveBeenCalledTimes(1);
    expect(document.getElementById("lootlog-root")).toBeNull();

    const restartedRuntime = bootstrapGameClient();

    expect(restartedRuntime).not.toBe(firstRuntime);
    expect(runtimeMocks.createRoot).toHaveBeenCalledTimes(2);
    expect(runtimeMocks.bootstrapPublicApi).toHaveBeenCalledTimes(2);

    restartedRuntime.dispose();
  });

  it("disposes an older runtime version before bootstrapping the current one", async () => {
    const disposePreviousRuntime = vi.fn();
    (window as RuntimeWindow).__lootlogGameClientRuntime = {
      dispose: disposePreviousRuntime,
      version: "older-version",
    };

    await loadMain();

    expect(disposePreviousRuntime).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.createRoot).toHaveBeenCalledTimes(1);
    expect(
      (window as RuntimeWindow).__lootlogGameClientRuntime?.version,
    ).not.toBe("older-version");
  });

  it("lets the extension replace the same-version userscript, then keeps userscript reloads from replacing it", async () => {
    const { bootstrapGameClient } = await loadMain();
    const userscript = bootstrapGameClient();
    const realtime = new RealtimeClient({ url: "https://gateway.lootlog.pl" });
    const extension = bootstrapGameClient({
      fetch: globalThis.fetch,
      createRealtime: () => realtime,
    });
    expect(extension.version).toBe(userscript.version);
    expect(extension.installation).toBe("extension");
    expect(userscript.state).toBe("disposed");
    expect(extension.state).toBe("ready");
    expect(runtimeMocks.unmount).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.createRoot).toHaveBeenCalledTimes(2);

    const reloadedUserscript = await loadMain();
    expect(reloadedUserscript.bootstrapGameClient()).toBe(extension);
    expect(extension.state).toBe("ready");
    expect(runtimeMocks.createRoot).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll("#lootlog-root")).toHaveLength(1);
  });

  it("finishes disposal after multiple failures and reports the first one only once", async () => {
    const { bootstrapGameClient } = await loadMain();
    const runtime = bootstrapGameClient();
    const first = new Error("unmount failed");
    runtimeMocks.unmount.mockImplementationOnce(() => {
      throw first;
    });
    runtimeMocks.teardownPublicApi.mockImplementationOnce(() => {
      throw new Error("public API teardown failed");
    });

    expect(() => runtime.dispose()).toThrow(first);
    expect(runtimeMocks.disposeSoundPlayback).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.disposeSocket).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.resetTransientRuntimeState).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.clearQueryClient).toHaveBeenCalledTimes(1);
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(
      (window as RuntimeWindow).__lootlogGameClientRuntime,
    ).toBeUndefined();
    expect(() => runtime.dispose()).not.toThrow();
    expect(runtimeMocks.unmount).toHaveBeenCalledTimes(1);
  });

  it("preserves the startup error when disposal also fails", async () => {
    const original = new Error("render failed");
    runtimeMocks.render.mockImplementationOnce(() => {
      throw original;
    });
    runtimeMocks.unmount.mockImplementationOnce(() => {
      throw new Error("unmount failed");
    });

    await expect(loadMain()).rejects.toThrow(original);
    expect(runtimeMocks.clearQueryClient).toHaveBeenCalledTimes(1);
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(
      (window as RuntimeWindow).__lootlogGameClientRuntime,
    ).toBeUndefined();
  });

  it("restores the platform when client configuration fails before creating a root", async () => {
    const { bootstrapGameClient } = await loadMain();
    bootstrapGameClient().dispose();
    const platformModule = await import("@/lib/game-client-platform");
    const apiModule = await import("@/lib/configure-api-clients");
    const previous = platformModule.getGameClientPlatform();
    const error = new Error("client configuration failed");
    const configure = vi
      .spyOn(apiModule, "configureGameApiClients")
      .mockImplementationOnce(() => {
        throw error;
      });
    const realtime = new RealtimeClient({ url: "https://gateway.lootlog.pl" });
    try {
      expect(() =>
        bootstrapGameClient({
          fetch: globalThis.fetch,
          createRealtime: () => realtime,
        }),
      ).toThrow(error);
      expect(platformModule.getGameClientPlatform()).toBe(previous);
      expect(document.getElementById("lootlog-root")).toBeNull();
      expect(
        (window as RuntimeWindow).__lootlogGameClientRuntime,
      ).toBeUndefined();
    } finally {
      configure.mockRestore();
    }
  });

  it("removes the allocated root when public API bootstrap fails", async () => {
    const error = new Error("public API bootstrap failure");
    runtimeMocks.bootstrapPublicApi.mockImplementationOnce(() => {
      throw error;
    });

    await expect(loadMain()).rejects.toThrow(error);

    expect(runtimeMocks.createRoot).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.unmount).toHaveBeenCalledTimes(1);
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(
      (window as RuntimeWindow).__lootlogGameClientRuntime,
    ).toBeUndefined();
  });

  it("removes the root element when React root creation fails", async () => {
    const error = new Error("React root creation failure");
    runtimeMocks.createRoot.mockImplementationOnce(() => {
      throw error;
    });

    await expect(loadMain()).rejects.toThrow(error);

    expect(runtimeMocks.bootstrapPublicApi).not.toHaveBeenCalled();
    expect(document.getElementById("lootlog-root")).toBeNull();
    expect(
      (window as RuntimeWindow).__lootlogGameClientRuntime,
    ).toBeUndefined();
  });
});
