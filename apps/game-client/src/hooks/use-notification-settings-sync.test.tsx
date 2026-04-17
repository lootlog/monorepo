import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDetectorSettings,
  createNotificationsSettings,
  getUserGameAccountPreferencesQueryKey,
} from "@/lib/game-account-notification-preferences";
import { useNotificationSettingsSync } from "@/hooks/use-notification-settings-sync";

const mockUseGuilds = vi.fn();
const mockUseUserGameAccountPreferences = vi.fn();
const mockUseUpdateUserGameAccountPreferences = vi.fn();
const mockFlushPending = vi.fn();
const mockMutate = vi.fn();

vi.mock("@/hooks/api/use-guilds", () => ({
  useGuilds: () => mockUseGuilds(),
}));

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

describe("useNotificationSettingsSync", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockUseGuilds.mockReset();
    mockUseGuilds.mockReturnValue({
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

    renderHook(() => useNotificationSettingsSync(), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          notifications: createNotificationsSettings(["guild-1", "guild-2"]),
          detector: createDetectorSettings(),
        },
        expect.any(Object),
      );
    });

    expect(
      queryClient.getQueryData(getUserGameAccountPreferencesQueryKey("202")),
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
    mockUseGuilds.mockReturnValue({
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

    renderHook(() => useNotificationSettingsSync(), {
      wrapper,
    });

    expect(mockMutate).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(getUserGameAccountPreferencesQueryKey("202")),
    ).toBeUndefined();
  });

  it("flushes queued detector events once the preferences query reaches a terminal state", async () => {
    mockUseUserGameAccountPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isFetched: true,
    });

    renderHook(() => useNotificationSettingsSync(), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockFlushPending).toHaveBeenCalledWith("202");
    });
  });
});
