import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useInitialConfiguration } from "./use-initial-configuration";
import { LanguageVersion, useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { gameEventsManager } from "@/lib/game-events-manager";
import { getInterfaceName } from "@/lib/game/get-interface-name";
import { getInitializeState } from "@/lib/game/get-initialize-state";
import { getWorldName } from "@/lib/game/get-world-name";
import { getAccountId } from "@/lib/game/get-account-id";
import { getCharacterId } from "@/lib/game/get-character-id";
import { getLanguageVersion } from "@/utils/game/get-language-version";
import { NpcType } from "@/hooks/api/use-npcs";

vi.mock("@/store/global.store");
vi.mock("@/store/notifications.store");
vi.mock("@/store/npc-detector.store");
vi.mock("@/hooks/api/use-guilds");
vi.mock("@/hooks/api/use-character-list");
vi.mock("@/lib/game-events-manager");
vi.mock("@/lib/game/get-interface-name");
vi.mock("@/lib/game/get-initialize-state");
vi.mock("@/lib/game/get-world-name");
vi.mock("@/lib/game/get-account-id");
vi.mock("@/lib/game/get-character-id");
vi.mock("@/utils/game/get-language-version");

describe("useInitialConfiguration", () => {
  const mockSetGameState = vi.fn();
  const mockSetDetectorSettings = vi.fn();
  const mockSetNotificationsState = vi.fn();
  const mockSetupProxies = vi.fn();
  const mockSetGameInitCallback = vi.fn();
  const mockSetReady = vi.fn();
  const mockCleanup = vi.fn();

  const mockCharacter1 = {
    id: "char1",
    name: "Character 1",
    prof: "warrior",
    lvl: 100,
    world: "world1",
  };

  const mockCharacter2 = {
    id: "char2",
    name: "Character 2",
    prof: "mage",
    lvl: 50,
    world: "world1",
  };

  const mockGuild1 = { id: "guild1", name: "Guild 1" };
  const mockGuild2 = { id: "guild2", name: "Guild 2" };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGlobalStore).mockReturnValue({
      gameState: {
        gameInitialized: false,
        gameInterface: null,
        world: null,
        accountId: null,
        characterId: null,
        languageVersion: null,
      },
      setGameState: mockSetGameState,
    } as never);

    vi.mocked(useNotificationsStore).mockReturnValue({
      settings: {},
      setState: mockSetNotificationsState,
    } as never);

    vi.mocked(useNpcDetectorStore).mockReturnValue({
      settings: {},
      setSettings: mockSetDetectorSettings,
    } as never);

    vi.mocked(useGuilds).mockReturnValue({
      data: [mockGuild1, mockGuild2],
    } as never);

    vi.mocked(useCharacterList).mockReturnValue({
      data: [mockCharacter1, mockCharacter2],
    } as never);

    vi.mocked(gameEventsManager).setupProxies = mockSetupProxies;
    vi.mocked(gameEventsManager).setGameInitCallback = mockSetGameInitCallback;
    vi.mocked(gameEventsManager).setReady = mockSetReady;
    vi.mocked(gameEventsManager).cleanup = mockCleanup;

    vi.mocked(getInterfaceName).mockReturnValue("ni");
    vi.mocked(getInitializeState).mockReturnValue(false);
    vi.mocked(getWorldName).mockReturnValue("world1");
    vi.mocked(getAccountId).mockReturnValue("account1");
    vi.mocked(getCharacterId).mockReturnValue("char1");
    vi.mocked(getLanguageVersion).mockReturnValue(LanguageVersion.PL);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("should setup game events manager on mount", () => {
    renderHook(() => useInitialConfiguration());

    expect(mockSetupProxies).toHaveBeenCalledTimes(1);
    expect(mockSetGameInitCallback).toHaveBeenCalledTimes(1);
  });

  it("should cleanup game events manager on unmount", () => {
    const { unmount } = renderHook(() => useInitialConfiguration());

    unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  describe("initNotificationsConfiguration", () => {
    it("should set recommended settings only for current character when they don't exist", async () => {
      vi.mocked(useGlobalStore).mockReturnValue({
        gameState: {
          gameInitialized: true,
          gameInterface: "interface1",
          world: "world1",
          accountId: "account1",
          characterId: "char1",
          languageVersion: "pl",
        },
        setGameState: mockSetGameState,
      } as never);

      renderHook(() => useInitialConfiguration());

      await waitFor(() => {
        expect(mockSetNotificationsState).toHaveBeenCalledWith({
          char1: {
            [NpcType.ELITE2]: {
              show: false,
              highlight: false,
              ignoreOtherWorlds: false,
              autoHideTimeout: 0,
              guildIds: ["guild1", "guild2"],
            },
            [NpcType.HERO]: {
              show: true,
              highlight: true,
              ignoreOtherWorlds: false,
              autoHideTimeout: 0,
              guildIds: ["guild1", "guild2"],
            },
            [NpcType.COLOSSUS]: {
              show: true,
              highlight: true,
              ignoreOtherWorlds: false,
              autoHideTimeout: 0,
              guildIds: ["guild1", "guild2"],
            },
            [NpcType.TITAN]: {
              show: true,
              highlight: true,
              ignoreOtherWorlds: false,
              autoHideTimeout: 0,
              guildIds: ["guild1", "guild2"],
            },
            message: {
              show: true,
              highlight: true,
              ignoreOtherWorlds: false,
              autoHideTimeout: 0,
              guildIds: ["guild1", "guild2"],
            },
          },
        });
      });
    });

    it("should not overwrite existing settings for current character", async () => {
      const existingSettings = {
        char1: {
          [NpcType.HERO]: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
          [NpcType.COLOSSUS]: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
          [NpcType.TITAN]: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
          [NpcType.ELITE2]: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
          message: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
        },
      };

      vi.mocked(useNotificationsStore).mockReturnValue({
        settings: existingSettings,
        setState: mockSetNotificationsState,
      } as never);

      vi.mocked(useGlobalStore).mockReturnValue({
        gameState: {
          gameInitialized: true,
          gameInterface: "ni",
          world: "world1",
          accountId: "account1",
          characterId: "char1",
          languageVersion: "pl",
        },
        setGameState: mockSetGameState,
      } as never);

      renderHook(() => useInitialConfiguration());

      await waitFor(() => {
        expect(mockSetNotificationsState).not.toHaveBeenCalled();
      });
    });

    it("should set settings for current character even if other characters have settings", async () => {
      const existingSettings = {
        char2: {
          [NpcType.HERO]: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
          [NpcType.COLOSSUS]: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
          [NpcType.TITAN]: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
          [NpcType.ELITE2]: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
          message: {
            show: false,
            highlight: false,
            ignoreOtherWorlds: true,
            autoHideTimeout: 5000,
            guildIds: ["guild1"],
          },
        },
      };

      vi.mocked(useNotificationsStore).mockReturnValue({
        settings: existingSettings,
        setState: mockSetNotificationsState,
      } as never);

      vi.mocked(useGlobalStore).mockReturnValue({
        gameState: {
          gameInitialized: true,
          gameInterface: "ni",
          world: "world1",
          accountId: "account1",
          characterId: "char1",
          languageVersion: "pl",
        },
        setGameState: mockSetGameState,
      } as never);

      renderHook(() => useInitialConfiguration());

      await waitFor(() => {
        expect(mockSetNotificationsState).toHaveBeenCalledWith(
          expect.objectContaining({
            char1: expect.any(Object),
            char2: existingSettings.char2,
          }),
        );
      });
    });

    it("should include guild IDs in the recommended settings", async () => {
      vi.mocked(useGlobalStore).mockReturnValue({
        gameState: {
          gameInitialized: true,
          gameInterface: "ni",
          world: "world1",
          accountId: "account1",
          characterId: "char1",
          languageVersion: "pl",
        },
        setGameState: mockSetGameState,
      } as never);

      renderHook(() => useInitialConfiguration());

      await waitFor(() => {
        expect(mockSetNotificationsState).toHaveBeenCalledWith(
          expect.objectContaining({
            char1: expect.objectContaining({
              [NpcType.HERO]: expect.objectContaining({
                guildIds: ["guild1", "guild2"],
              }),
            }),
          }),
        );
      });
    });

    it("should not initialize notifications if game is not initialized", async () => {
      vi.mocked(useGlobalStore).mockReturnValue({
        gameState: {
          gameInitialized: false,
          gameInterface: null,
          world: null,
          accountId: null,
          characterId: null,
          languageVersion: null,
        },
        setGameState: mockSetGameState,
      } as never);

      renderHook(() => useInitialConfiguration());

      await waitFor(() => {
        expect(mockSetNotificationsState).not.toHaveBeenCalled();
      });
    });
  });

  describe("initDetectorConfiguration", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should set recommended detector settings only for current character when they don't exist", () => {
      vi.mocked(getInitializeState).mockReturnValue(true);

      renderHook(() => useInitialConfiguration());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];
      gameInitCallback();

      vi.advanceTimersByTime(0);

      expect(mockSetDetectorSettings).toHaveBeenCalledWith("char1", {
        [NpcType.ELITE2]: {
          detect: false,
          notifyWindow: false,
          autoNotifyClan: false,
          autoNotifyChat: false,
          notifySound: true,
          highlight: false,
          guildIds: [],
        },
        [NpcType.HERO]: {
          detect: true,
          notifyWindow: true,
          autoNotifyClan: false,
          autoNotifyChat: false,
          notifySound: true,
          highlight: true,
          guildIds: [],
        },
        [NpcType.COLOSSUS]: {
          detect: true,
          notifyWindow: true,
          autoNotifyClan: false,
          autoNotifyChat: false,
          notifySound: true,
          highlight: true,
          guildIds: [],
        },
        [NpcType.TITAN]: {
          detect: true,
          notifyWindow: true,
          autoNotifyClan: false,
          autoNotifyChat: false,
          notifySound: true,
          highlight: true,
          guildIds: [],
        },
      });
    });

    it("should not overwrite existing detector settings for current character", () => {
      const existingDetectorSettings = {
        char1: {
          [NpcType.HERO]: {
            detect: false,
            notifyWindow: false,
            autoNotifyClan: true,
            autoNotifyChat: true,
            notifySound: false,
            highlight: false,
            guildIds: ["guild1"],
          },
          [NpcType.COLOSSUS]: {
            detect: false,
            notifyWindow: false,
            autoNotifyClan: true,
            autoNotifyChat: true,
            notifySound: false,
            highlight: false,
            guildIds: ["guild1"],
          },
          [NpcType.TITAN]: {
            detect: false,
            notifyWindow: false,
            autoNotifyClan: true,
            autoNotifyChat: true,
            notifySound: false,
            highlight: false,
            guildIds: ["guild1"],
          },
          [NpcType.ELITE2]: {
            detect: false,
            notifyWindow: false,
            autoNotifyClan: true,
            autoNotifyChat: true,
            notifySound: false,
            highlight: false,
            guildIds: ["guild1"],
          },
        },
      };

      vi.mocked(useNpcDetectorStore).mockReturnValue({
        settings: existingDetectorSettings,
        setSettings: mockSetDetectorSettings,
      } as never);

      vi.mocked(getInitializeState).mockReturnValue(true);

      renderHook(() => useInitialConfiguration());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];
      gameInitCallback();

      vi.advanceTimersByTime(0);

      expect(mockSetDetectorSettings).not.toHaveBeenCalled();
    });
  });

  describe("game initialization flow", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should initialize game state when game is ready", () => {
      vi.mocked(getInitializeState).mockReturnValue(true);

      renderHook(() => useInitialConfiguration());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];
      gameInitCallback();

      vi.advanceTimersByTime(0);

      expect(mockSetGameState).toHaveBeenCalledWith({
        gameInitialized: true,
        gameInterface: "ni",
        world: "world1",
        accountId: "account1",
        characterId: "char1",
        languageVersion: "pl",
      });

      expect(mockSetReady).toHaveBeenCalledWith(true);
    });

    it("should not initialize if game is not ready", () => {
      vi.mocked(getInitializeState).mockReturnValue(false);

      renderHook(() => useInitialConfiguration());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];
      gameInitCallback();

      vi.advanceTimersByTime(0);

      expect(mockSetGameState).not.toHaveBeenCalled();
      expect(mockSetReady).not.toHaveBeenCalled();
    });

    it("should not initialize multiple times", () => {
      vi.mocked(getInitializeState).mockReturnValue(true);

      renderHook(() => useInitialConfiguration());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];

      gameInitCallback();
      vi.advanceTimersByTime(0);

      gameInitCallback();
      vi.advanceTimersByTime(0);

      expect(mockSetGameState).toHaveBeenCalledTimes(1);
      expect(mockSetReady).toHaveBeenCalledTimes(1);
    });
  });
});
