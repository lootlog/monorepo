import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "@/store/game.store";
import {
  setTestRuntimeGame,
  testRuntimeWindow,
} from "@/test/test-runtime-window";
import { useCharacterList } from "./use-character-list";

describe("useCharacterList", () => {
  beforeEach(() => {
    useGameStore.getState().clearGame();
    window.localStorage.clear();
    testRuntimeWindow.getCookie = vi.fn(() => "hs3-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response("[]", {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
        ),
      ),
    );
  });

  it("waits for canonical game identity before fetching characters", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useCharacterList(), { wrapper });

    expect(fetch).not.toHaveBeenCalled();

    setTestRuntimeGame({
      hero: { accountId: "123" },
      world: "fobos",
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  });
});
