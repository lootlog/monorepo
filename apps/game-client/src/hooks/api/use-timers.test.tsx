import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTimers } from "@/api";
import { useTimers } from "./use-timers";

vi.mock("@/api", () => ({
  fetchTimers: vi.fn(),
}));

const waitForMicrotask = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

describe("useTimers", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.mocked(fetchTimers).mockResolvedValue([]);
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("does not refetch fresh timer data on focus or remount", async () => {
    const firstRender = renderHook(() => useTimers({ world: "pandora" }), {
      wrapper,
    });

    await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event("focus"));
    await waitForMicrotask();
    expect(fetchTimers).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    renderHook(() => useTimers({ world: "pandora" }), {
      wrapper,
    });
    await waitForMicrotask();

    expect(fetchTimers).toHaveBeenCalledTimes(1);
  });
});
