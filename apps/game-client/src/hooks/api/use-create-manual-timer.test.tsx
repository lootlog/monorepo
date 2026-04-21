import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/features/public-api/query-keys";

const mockCreateManualTimer = vi.fn();

vi.mock("@/api", () => ({
  createManualTimer: (...args: unknown[]) => mockCreateManualTimer(...args),
}));

import { useCreateManualTimer } from "./use-create-manual-timer";

describe("useCreateManualTimer", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    mockCreateManualTimer.mockReset();
    mockCreateManualTimer.mockResolvedValue({
      successful: [{ guildId: "guild-1" }],
      failed: [],
      totalGuilds: 1,
      successCount: 1,
      failureCount: 0,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("creates a manual timer and invalidates the timers query family", async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateManualTimer(), { wrapper });

    result.current.mutate({
      guildIds: ["guild-1"],
      name: "Tanroth",
      world: "pandora",
      minSeconds: 30,
      maxSeconds: 60,
    });

    await waitFor(() => {
      expect(mockCreateManualTimer).toHaveBeenCalledWith({
        guildIds: ["guild-1"],
        name: "Tanroth",
        world: "pandora",
        minSeconds: 30,
        maxSeconds: 60,
      });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.allTimers(),
      });
    });
  });
});
