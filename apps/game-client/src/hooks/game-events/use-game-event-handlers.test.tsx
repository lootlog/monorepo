import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRegister = vi.fn();
const mockHandleInitialEvents = vi.fn();
const mockCleanup = vi.fn();
const mockEventDispatcherConstructor = vi.fn();

let gameInitialized = false;

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: { gameState: { gameInitialized: boolean } }) => boolean,
  ) =>
    selector({
      gameState: {
        gameInitialized,
      },
    }),
}));

vi.mock("@/lib/event-dispatcher", () => ({
  EventDispatcher: function MockEventDispatcher() {
    mockEventDispatcherConstructor();

    return {
      register: mockRegister,
      handleInitialEvents: mockHandleInitialEvents,
      cleanup: mockCleanup,
    };
  },
}));

vi.mock("./use-character-tooltip-catching-guilds", () => ({
  useCharacterTooltipCatchingGuilds: vi.fn(),
}));

vi.mock("./use-other-catching-guild-glow", () => ({
  useOtherCatchingGuildGlow: vi.fn(),
}));

vi.mock("./use-online-character-owners", () => ({
  useOnlineCharacterOwners: vi.fn(),
}));

vi.mock("./use-who-is-here-lootlog-highlight", () => ({
  useWhoIsHereLootlogHighlight: vi.fn(),
}));

import { useGameEventHandlers } from "./use-game-event-handlers";

describe("useGameEventHandlers", () => {
  beforeEach(() => {
    gameInitialized = false;
    mockRegister.mockReset();
    mockHandleInitialEvents.mockReset();
    mockCleanup.mockReset();
    mockEventDispatcherConstructor.mockReset();
  });

  it("creates and registers the dispatcher only once", () => {
    const { rerender } = renderHook(() => useGameEventHandlers());

    rerender();

    expect(mockEventDispatcherConstructor).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockHandleInitialEvents).not.toHaveBeenCalled();
  });

  it("runs initial event handling after the game becomes initialized", () => {
    const { rerender } = renderHook(() => useGameEventHandlers());

    gameInitialized = true;
    rerender();

    expect(mockHandleInitialEvents).toHaveBeenCalledTimes(1);
  });

  it("cleans up the dispatcher on unmount", () => {
    const { unmount } = renderHook(() => useGameEventHandlers());

    unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  it("shares one dispatcher when the client is mounted more than once", () => {
    gameInitialized = true;
    const firstClient = renderHook(() => useGameEventHandlers());
    const secondClient = renderHook(() => useGameEventHandlers());

    expect(mockEventDispatcherConstructor).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockHandleInitialEvents).toHaveBeenCalledTimes(1);

    firstClient.unmount();
    expect(mockCleanup).not.toHaveBeenCalled();

    secondClient.unmount();
    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });
});
