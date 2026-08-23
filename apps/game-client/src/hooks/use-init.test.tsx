import { renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetGameState = vi.fn();
const mockSetupProxies = vi.fn();
const mockSetGameInitCallback = vi.fn();
const mockCleanup = vi.fn();
const mockGetInitializeState = vi.fn();
const mockPipelineInstall = vi.fn();
const mockPipelineSetReady = vi.fn();
const mockPipelineCleanup = vi.fn();
const mockProjectionBootstrap = vi.fn();
const mockProjectionCleanup = vi.fn();
const mockInteractionInstall = vi.fn();
const mockInteractionCleanup = vi.fn();

let capturedGameInitCallback: (() => boolean) | null = null;

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: { setGameState: typeof mockSetGameState }) => unknown,
  ) =>
    selector({
      setGameState: mockSetGameState,
    }),
}));

vi.mock("@/lib/margonem-runtime/margonem-runtime-bridge", () => ({
  margonemRuntimeBridge: {
    setupProxies: (...args: unknown[]) => mockSetupProxies(...args),
    setGameInitCallback: (callback: () => boolean) => {
      capturedGameInitCallback = callback;
      mockSetGameInitCallback(callback);
    },
    cleanup: (...args: unknown[]) => mockCleanup(...args),
  },
}));

vi.mock("@/lib/margonem-runtime/runtime-adapter", () => ({
  isMargonemRuntimeReady: (...args: unknown[]) =>
    mockGetInitializeState(...args),
}));

vi.mock("@/lib/margonem-runtime/runtime-event-pipeline", () => ({
  runtimeEventPipeline: {
    install: (...args: unknown[]) => mockPipelineInstall(...args),
    setReady: (...args: unknown[]) => mockPipelineSetReady(...args),
    cleanup: (...args: unknown[]) => mockPipelineCleanup(...args),
  },
}));

vi.mock("@/lib/margonem-runtime/runtime-state-projection", () => ({
  runtimeStateProjection: {
    bootstrap: (...args: unknown[]) => mockProjectionBootstrap(...args),
    cleanup: (...args: unknown[]) => mockProjectionCleanup(...args),
  },
}));

vi.mock("@/lib/margonem-runtime/runtime-interaction-coordinator", () => ({
  runtimeInteractionCoordinator: {
    install: (...args: unknown[]) => mockInteractionInstall(...args),
    cleanup: (...args: unknown[]) => mockInteractionCleanup(...args),
  },
}));

import { useInit } from "./use-init";

describe("useInit", () => {
  beforeEach(() => {
    capturedGameInitCallback = null;
    mockSetGameState.mockReset();
    mockSetupProxies.mockReset();
    mockSetGameInitCallback.mockReset();
    mockCleanup.mockReset();
    mockGetInitializeState.mockReset();
    mockPipelineInstall.mockReset();
    mockPipelineSetReady.mockReset();
    mockPipelineCleanup.mockReset();
    mockProjectionBootstrap.mockReset();
    mockProjectionBootstrap.mockReturnValue(true);
    mockProjectionCleanup.mockReset();
    mockInteractionInstall.mockReset();
    mockInteractionCleanup.mockReset();
  });

  it("registers proxies and cleans them up on unmount", () => {
    const { unmount } = renderHook(() => useInit());

    expect(mockSetupProxies).toHaveBeenCalledTimes(1);
    expect(mockSetGameInitCallback).toHaveBeenCalledTimes(1);
    expect(mockPipelineInstall).toHaveBeenCalledTimes(1);
    expect(mockInteractionInstall).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(mockPipelineCleanup).toHaveBeenCalledTimes(1);
    expect(mockProjectionCleanup).toHaveBeenCalledTimes(1);
    expect(mockInteractionCleanup).toHaveBeenCalledTimes(1);
  });

  it("does not initialize the game before the client is ready", () => {
    mockGetInitializeState.mockReturnValue(false);
    renderHook(() => useInit());

    expect(capturedGameInitCallback).not.toBeNull();
    expect(capturedGameInitCallback?.()).toBe(false);
    expect(mockSetGameState).not.toHaveBeenCalled();
    expect(mockPipelineSetReady).not.toHaveBeenCalled();
  });

  it("initializes the game only once", () => {
    mockGetInitializeState.mockReturnValue(true);
    renderHook(() => useInit());

    expect(capturedGameInitCallback).not.toBeNull();
    expect(capturedGameInitCallback?.()).toBe(false);
    expect(mockSetGameState).toHaveBeenCalledTimes(1);
    expect(mockSetGameState).toHaveBeenCalledWith({
      gameInitialized: true,
    });
    expect(mockPipelineSetReady).toHaveBeenCalledTimes(1);
    expect(mockPipelineSetReady).toHaveBeenCalledWith(true);
    expect(mockProjectionBootstrap).toHaveBeenCalledTimes(1);
  });

  it("reinitializes the runtime after the StrictMode cleanup cycle", () => {
    mockGetInitializeState.mockReturnValue(true);

    renderHook(() => useInit(), { wrapper: StrictMode });

    expect(mockProjectionCleanup).toHaveBeenCalledOnce();
    expect(mockProjectionBootstrap).toHaveBeenCalledTimes(2);
    expect(mockPipelineSetReady).toHaveBeenCalledTimes(2);
    expect(mockSetGameState).toHaveBeenCalledTimes(2);
  });

  it("keeps the pipeline paused when the initial snapshot fails", () => {
    mockGetInitializeState.mockReturnValue(true);
    mockProjectionBootstrap.mockReturnValue(false);

    renderHook(() => useInit());

    expect(mockProjectionBootstrap).toHaveBeenCalledOnce();
    expect(mockSetGameState).not.toHaveBeenCalled();
    expect(mockPipelineSetReady).not.toHaveBeenCalled();
  });
});
