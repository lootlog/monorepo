import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";
import { useGameAccountPreferencesSync } from "@/hooks/use-game-account-preferences-sync";
import * as UsersApi from "@/lib/api/generated/main/users/users";
import { useGameStore } from "@/store/game.store";

const mockUseAccessibleGuilds = vi.fn();
const mockUseUserGameAccountPreferences = vi.fn();
const mockUseUpdateUserGameAccountPreferences = vi.fn();
const mockFlushPending = vi.fn();
const mockMutate = vi.fn();
const { mockGetAccountId } = vi.hoisted(() => ({
  mockGetAccountId: vi.fn((): string | null => "202"),
}));

vi.mock("@/lib/api/generated/main/users/users", async () => {
  const actual = await vi.importActual<typeof UsersApi>(
    "@/lib/api/generated/main/users/users",
  );

  return {
    ...actual,
    useUsersControllerGetCurrentUserAccessibleGuilds: () =>
      mockUseAccessibleGuilds(),
  };
});

vi.mock("@/hooks/api/use-user-account-preferences", () => ({
  useUserGameAccountPreferences: (...args: unknown[]) =>
    mockUseUserGameAccountPreferences(...args),
  useUpdateUserGameAccountPreferences: (...args: unknown[]) =>
    mockUseUpdateUserGameAccountPreferences(...args),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      account: 202,
    },
    getAccountId: () => mockGetAccountId(),
  },
}));

vi.mock("@/processors/npcs-detection-processor", () => ({
  npcsDetectionProcessor: {
    flushPending: (...args: unknown[]) => mockFlushPending(...args),
  },
}));

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: { gameState: { gameInitialized: boolean } }) => boolean,
  ) =>
    selector({
      gameState: {
        gameInitialized: true,
      },
    }),
}));

describe("useGameAccountPreferencesSync", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockUseAccessibleGuilds.mockReset();
    mockUseAccessibleGuilds.mockReturnValue({
      data: [{ id: "guild-1" }, { id: "guild-2" }],
      isFetched: true,
      isFetching: false,
      isLoading: false,
    });
    mockUseUserGameAccountPreferences.mockReset();
    mockUseUpdateUserGameAccountPreferences.mockReset();
    mockUseUpdateUserGameAccountPreferences.mockReturnValue({
      mutate: mockMutate,
    });
    mockMutate.mockReset();
    mockFlushPending.mockReset();
    mockGetAccountId.mockReset();
    mockGetAccountId.mockReturnValue("202");
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "202",
        characterId: "101",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Hero",
        profession: "w",
      },
      map: { id: 1, name: "Map", visibility: 30 },
      world: "pandora",
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("seeds backend defaults when account settings are missing on the server", async () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: {
        accountId: "202",
        notifications: createNotificationsSettings(),
        detector: createDetectorSettings(),
        hasStoredNotifications: false,
        hasStoredDetector: false,
        hasStoredPreferences: false,
      },
      isLoading: false,
      isFetching: false,
      isFetched: true,
    });

    renderHook(() => useGameAccountPreferencesSync(), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          notifications: createNotificationsSettings(["guild-1", "guild-2"]),
          detector: createDetectorSettings(),
        },
        expect.objectContaining({
          onError: expect.any(Function),
        }),
      );
    });

    expect(
      queryClient.getQueryData(
        UsersApi.getUsersControllerGetUserGameAccountPreferencesQueryKey({
          accountId: "202",
        }),
      ),
    ).toEqual({
      accountId: "202",
      notifications: createNotificationsSettings(["guild-1", "guild-2"]),
      detector: createDetectorSettings(),
      hasStoredNotifications: true,
      hasStoredDetector: true,
      hasStoredPreferences: true,
    });
  });

  it("does not seed defaults before guild membership finishes loading", () => {
    mockUseAccessibleGuilds.mockReturnValue({
      data: [],
      isFetched: false,
      isFetching: true,
      isLoading: true,
    });
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: {
        accountId: "202",
        notifications: createNotificationsSettings(),
        detector: createDetectorSettings(),
        hasStoredNotifications: false,
        hasStoredDetector: false,
        hasStoredPreferences: false,
      },
      isLoading: false,
      isFetching: false,
      isFetched: true,
    });

    renderHook(() => useGameAccountPreferencesSync(), {
      wrapper,
    });

    expect(mockMutate).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(
        UsersApi.getUsersControllerGetUserGameAccountPreferencesQueryKey({
          accountId: "202",
        }),
      ),
    ).toBeUndefined();
  });

  it("flushes queued detector events once the preferences query reaches a terminal state", async () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isFetched: true,
    });

    renderHook(() => useGameAccountPreferencesSync(), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockFlushPending).toHaveBeenCalledWith("202");
    });
  });

  it("reacts when the runtime domain publishes the account identity", () => {
    useGameStore.getState().clearGame();
    mockUseUserGameAccountPreferences.mockImplementation(
      (accountId: string | null) => ({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isFetched: accountId === "202",
      }),
    );

    const { rerender } = renderHook(() => useGameAccountPreferencesSync(), {
      wrapper,
    });

    expect(mockFlushPending).not.toHaveBeenCalled();

    act(() => {
      useGameStore.getState().replaceGame({
        hero: {
          accountId: "202",
          characterId: "101",
          currentHp: 1,
          icon: "hero.gif",
          level: 300,
          maxHp: 1,
          name: "Hero",
          profession: "w",
        },
        map: { id: 1, name: "Map", visibility: 30 },
        world: "pandora",
      });
    });
    rerender();

    expect(mockFlushPending).toHaveBeenCalledWith("202");
  });
});
