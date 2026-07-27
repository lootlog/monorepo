import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as UsersModule from "@lootlog/api-client/react-query/main/users";
import type { UpdateUserPreferencesDtoTheme } from "@lootlog/api-client/models/main/update-user-preferences-dto-theme";
import type { UpdateUserPreferencesDto } from "@lootlog/api-client/models/main/update-user-preferences-dto";
import type { UserPreferencesResponseDtoOutput } from "@lootlog/api-client/models/main/user-preferences-response-dto-output";
import { useUpdateUserPreferences } from "./use-user-preferences";

const { mockUpdateUserPreferences } = vi.hoisted(() => ({
  mockUpdateUserPreferences: vi.fn(),
}));

vi.mock("@lootlog/api-client/react-query/main/users", async () => {
  const actual = await vi.importActual<typeof UsersModule>(
    "@lootlog/api-client/react-query/main/users",
  );

  return {
    ...actual,
    usersControllerUpdateUserPreferences: (...args: unknown[]) =>
      mockUpdateUserPreferences(...args),
  };
});

const createTestUserPreferences = (): UserPreferencesResponseDtoOutput => ({
  userId: "user-1",
  guildsOrder: ["guild-1"],
  hiddenGuildIds: [],
  theme: "default",
  chatAppearance: {
    npcLayout: "tile",
    fontScalePercent: 100,
    messageGapPx: 4,
    showTimestamp: true,
    showGuildLabel: true,
    showNpcAvatar: true,
    showNpcLevel: true,
    showNpcLocationAndCoordinates: true,
  },
  mutes: {
    players: [{ discordId: "discord-1", displayName: "Alpha" }],
    npcs: [
      {
        npcKey: "npc-1",
        npcId: 1,
        name: "Orla",
        npcType: "HERO",
        lvl: 120,
        prof: "w",
        icon: "orla.png",
      },
    ],
  },
});

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useUpdateUserPreferences", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
        queries: {
          retry: false,
        },
      },
    });

    mockUpdateUserPreferences.mockReset();
  });

  it("optimistically merges player mute updates without replacing NPC mutes", async () => {
    const deferred = createDeferred<UserPreferencesResponseDtoOutput>();
    const previousData = createTestUserPreferences();
    const nextPlayers = [{ discordId: "discord-2", displayName: "Beta" }];
    const payload: UpdateUserPreferencesDto = {
      mutes: {
        players: nextPlayers,
      },
    };

    mockUpdateUserPreferences.mockReturnValue(deferred.promise);
    queryClient.setQueryData(
      UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
      previousData,
    );

    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(
          UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
        ),
      ).toEqual({
        ...previousData,
        mutes: {
          players: nextPlayers,
          npcs: previousData.mutes.npcs,
        },
      });
    });

    deferred.resolve(previousData);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("optimistically merges a partial chat appearance patch", async () => {
    const deferred = createDeferred<UserPreferencesResponseDtoOutput>();
    const previousData = createTestUserPreferences();
    const payload: UpdateUserPreferencesDto = {
      chatAppearance: { messageGapPx: 12 },
    };

    mockUpdateUserPreferences.mockReturnValue(deferred.promise);
    queryClient.setQueryData(
      UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
      previousData,
    );
    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.mutate(payload));

    await waitFor(() => {
      const optimistic =
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(
          UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
        );
      expect(optimistic?.chatAppearance).toEqual({
        ...previousData.chatAppearance,
        messageGapPx: 12,
      });
    });

    deferred.resolve({
      ...previousData,
      chatAppearance: {
        ...previousData.chatAppearance,
        messageGapPx: 12,
      },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("optimistically replaces hidden guild ids", async () => {
    const deferred = createDeferred<UserPreferencesResponseDtoOutput>();
    const previousData = createTestUserPreferences();

    mockUpdateUserPreferences.mockReturnValue(deferred.promise);
    queryClient.setQueryData(
      UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
      previousData,
    );
    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        hiddenGuildIds: ["guild-1", "guild-unavailable"],
      });
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(
          UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
        )?.hiddenGuildIds,
      ).toEqual(["guild-1", "guild-unavailable"]);
    });

    deferred.resolve({
      ...previousData,
      hiddenGuildIds: ["guild-1", "guild-unavailable"],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("serializes rapid preference updates", async () => {
    const firstDeferred = createDeferred<UserPreferencesResponseDtoOutput>();
    const secondDeferred = createDeferred<UserPreferencesResponseDtoOutput>();
    const previousData = createTestUserPreferences();
    mockUpdateUserPreferences
      .mockReturnValueOnce(firstDeferred.promise)
      .mockReturnValueOnce(secondDeferred.promise);
    queryClient.setQueryData(
      UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
      previousData,
    );
    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ hiddenGuildIds: ["guild-1"] });
      result.current.mutate({ hiddenGuildIds: ["guild-1", "guild-2"] });
    });

    await waitFor(() =>
      expect(mockUpdateUserPreferences).toHaveBeenCalledTimes(1),
    );

    firstDeferred.resolve({
      ...previousData,
      hiddenGuildIds: ["guild-1"],
    });
    await waitFor(() =>
      expect(mockUpdateUserPreferences).toHaveBeenCalledTimes(2),
    );

    secondDeferred.resolve({
      ...previousData,
      hiddenGuildIds: ["guild-1", "guild-2"],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("optimistically merges NPC mute updates without replacing player mutes", async () => {
    const deferred = createDeferred<UserPreferencesResponseDtoOutput>();
    const previousData = createTestUserPreferences();
    const nextNpcs = [
      {
        npcKey: "npc-2",
        npcId: 2,
        name: "Maddok",
        npcType: "TITAN" as const,
        lvl: 300,
        prof: null,
        icon: null,
      },
    ];
    const payload: UpdateUserPreferencesDto = {
      mutes: {
        npcs: nextNpcs,
      },
    };

    mockUpdateUserPreferences.mockReturnValue(deferred.promise);
    queryClient.setQueryData(
      UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
      previousData,
    );

    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(
          UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
        ),
      ).toEqual({
        ...previousData,
        mutes: {
          players: previousData.mutes.players,
          npcs: nextNpcs,
        },
      });
    });

    deferred.resolve(previousData);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("restores the previous cache entry when the mutation fails", async () => {
    const previousData = createTestUserPreferences();
    const payload: UpdateUserPreferencesDto = {
      mutes: {
        players: [{ discordId: "discord-3", displayName: "Gamma" }],
      },
    };

    mockUpdateUserPreferences.mockRejectedValue(new Error("Request failed"));
    queryClient.setQueryData(
      UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
      previousData,
    );

    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(payload).catch(() => undefined);
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(
          UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
        ),
      ).toEqual(previousData);
    });

    expect(result.current.isError).toBe(true);
  });

  it("replaces the cache with the server response after success", async () => {
    const previousData = createTestUserPreferences();
    const serverData: UserPreferencesResponseDtoOutput = {
      ...previousData,
      theme: "updated",
      mutes: {
        players: [],
        npcs: [],
      },
    };

    mockUpdateUserPreferences.mockResolvedValue(serverData);
    queryClient.setQueryData(
      UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
      previousData,
    );

    const { result } = renderHook(() => useUpdateUserPreferences(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        theme: "default" as UpdateUserPreferencesDtoTheme,
      });
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<UserPreferencesResponseDtoOutput>(
          UsersModule.getUsersControllerGetUserPreferencesQueryKey(),
        ),
      ).toEqual(serverData);
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
