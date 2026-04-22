import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUsersControllerGetUserPreferencesQueryKey } from "@/lib/api/generated/main/users/users";
import type {
  UpdateUserPreferencesDtoTheme,
  UpdateUserPreferencesDto,
  UserPreferencesResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import { useUpdateUserPreferences } from "./use-user-preferences";

const { mockUpdateUserPreferences } = vi.hoisted(() => ({
  mockUpdateUserPreferences: vi.fn(),
}));

vi.mock("@/lib/api/generated/main/users/users", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/generated/main/users/users")
  >("@/lib/api/generated/main/users/users");

  return {
    ...actual,
    usersControllerUpdateUserPreferences: (...args: unknown[]) =>
      mockUpdateUserPreferences(...args),
  };
});

const createTestUserPreferences = (): UserPreferencesResponseDtoOutput => ({
  userId: "user-1",
  guildsOrder: ["guild-1"],
  theme: "default",
  colorMode: "dark",
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
      getUsersControllerGetUserPreferencesQueryKey(),
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
          getUsersControllerGetUserPreferencesQueryKey(),
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
      getUsersControllerGetUserPreferencesQueryKey(),
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
          getUsersControllerGetUserPreferencesQueryKey(),
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
      getUsersControllerGetUserPreferencesQueryKey(),
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
          getUsersControllerGetUserPreferencesQueryKey(),
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
      getUsersControllerGetUserPreferencesQueryKey(),
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
          getUsersControllerGetUserPreferencesQueryKey(),
        ),
      ).toEqual(serverData);
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
