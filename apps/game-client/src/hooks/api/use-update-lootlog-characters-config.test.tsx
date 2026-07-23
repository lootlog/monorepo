import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useUpdateLootlogCharactersConfig } from "./use-update-lootlog-characters-config";

const { createOrUpdateConfig } = vi.hoisted(() => ({
  createOrUpdateConfig: vi.fn(),
}));

vi.mock("@lootlog/api-client/react-query/main/user-lootlog-config", () => ({
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey: ({
    accountId,
  }: {
    accountId: string;
  }) => ["lootlog-config", accountId],
  userLootlogConfigControllerCreateOrUpdateLootlogCharacterConfig:
    createOrUpdateConfig,
}));

describe("useUpdateLootlogCharactersConfig", () => {
  beforeEach(() => {
    createOrUpdateConfig.mockReset();
    createOrUpdateConfig.mockResolvedValue({});
    useGameStore.getState().clearGame();
  });

  it("does not submit a config without canonical game identity", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateLootlogCharactersConfig(), {
      wrapper,
    });

    await expect(
      act(() =>
        result.current.mutateAsync({
          catchingGuildIds: [],
          characterId: "101",
        }),
      ),
    ).rejects.toThrow("Canonical game identity is unavailable");
    expect(createOrUpdateConfig).not.toHaveBeenCalled();

    setTestRuntimeGame({ hero: { accountId: "202" } });

    await act(() =>
      result.current.mutateAsync({
        catchingGuildIds: ["12"],
        characterId: "101",
      }),
    );

    expect(createOrUpdateConfig).toHaveBeenCalledWith(
      { accountId: "202" },
      { catchingGuildIds: ["12"], characterId: "101" },
    );
  });
});
