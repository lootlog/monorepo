import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { StrictMode, type PropsWithChildren } from "react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import {
  debouncedSyncGlobalSettings,
  disposeTimerSettingsSync,
} from "@/store/timer-settings-sync";
import { useTimerSettingsMutationsRegistry } from "./use-timer-settings-mutations-registry";

afterEach(() => {
  disposeTimerSettingsSync();
  vi.useRealTimers();
});
it("registers real HTTP synchronization in StrictMode and cancels pending work on unmount", async () => {
  const requests: Request[] = [];
  const restore = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: (input, init) => {
        requests.push(new Request(input, init));
        return Promise.resolve(Response.json({}));
      },
    },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </StrictMode>
  );
  const view = renderHook(useTimerSettingsMutationsRegistry, {
    wrapper: Wrapper,
  });
  onTestFinished(() => {
    view.unmount();
    queryClient.clear();
    restore();
  });
  act(() => debouncedSyncGlobalSettings({ syncEnabled: true }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(await requests[0]?.json()).toEqual({ syncEnabled: true });
  vi.useFakeTimers();
  act(() => debouncedSyncGlobalSettings({ syncEnabled: false }));
  view.unmount();
  await act(() => vi.advanceTimersByTimeAsync(500));
  expect(requests).toHaveLength(1);
});
