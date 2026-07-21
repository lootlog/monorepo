import { afterEach, describe, expect, it, vi } from "vitest";

const runtimeMocks = vi.hoisted(() => {
  const render = vi.fn();
  const unmount = vi.fn();
  const teardownPublicApi = vi.fn();
  const triggerErrorMonitoringTest = vi.fn(() => true);
  const clearQueryClient = vi.fn();
  const disposeSoundPlayback = vi.fn();
  const disposeSocket = vi.fn();
  const captureBootstrapError = vi.fn();
  const initializeErrorMonitoring = vi.fn();
  const onRecoverableError = vi.fn();
  const onUncaughtError = vi.fn();
  const resetTransientRuntimeState = vi.fn();

  return {
    bootstrapPublicApi: vi.fn(() => teardownPublicApi),
    captureBootstrapError,
    clearQueryClient,
    createRoot: vi.fn(() => ({ render, unmount })),
    disposeSoundPlayback,
    disposeSocket,
    initializeErrorMonitoring,
    onRecoverableError,
    onUncaughtError,
    resetTransientRuntimeState,
    render,
    teardownPublicApi,
    triggerErrorMonitoringTest,
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

vi.mock("@/lib/error-monitoring", () => ({
  captureBootstrapError: runtimeMocks.captureBootstrapError,
  getReactRootErrorHandlers: () => ({
    onRecoverableError: runtimeMocks.onRecoverableError,
    onUncaughtError: runtimeMocks.onUncaughtError,
  }),
  initializeErrorMonitoring: runtimeMocks.initializeErrorMonitoring,
  triggerErrorMonitoringTest: runtimeMocks.triggerErrorMonitoringTest,
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
    runtimeMocks.captureBootstrapError.mockClear();
    runtimeMocks.disposeSoundPlayback.mockClear();
    runtimeMocks.disposeSocket.mockClear();
    runtimeMocks.initializeErrorMonitoring.mockClear();
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
      {
        onRecoverableError: runtimeMocks.onRecoverableError,
        onUncaughtError: runtimeMocks.onUncaughtError,
      },
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

  it("removes the allocated root when public API bootstrap fails", async () => {
    const error = new Error("public API bootstrap failure");
    runtimeMocks.bootstrapPublicApi.mockImplementationOnce(() => {
      throw error;
    });

    await expect(loadMain()).rejects.toThrow(error);

    expect(runtimeMocks.createRoot).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.initializeErrorMonitoring).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.captureBootstrapError).toHaveBeenCalledWith(error);
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
