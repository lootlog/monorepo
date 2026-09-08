import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getSoundSettingsControllerGetSettingsQueryKey,
  type SoundSettingsResponseDto,
} from "@lootlog/client/main";
import { useUpdateSoundSettings } from "./use-sound-settings";

it("preserves HTTP timestamps and other sound fields during an optimistic patch, then rolls back on failure", async () => {
  const response = Promise.withResolvers<Response>();
  const restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: () => response.promise,
    },
  });
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const queryKey = getSoundSettingsControllerGetSettingsQueryKey();
  const initial: SoundSettingsResponseDto = {
    userId: "user-1",
    masterVolume: 0.5,
    notificationsVolume: 0.4,
    detectorVolume: 0.3,
    timersVolume: 0.2,
    pingsVolume: 0.1,
    notificationsConfig: { HERO: { volume: 0.5, soundUrl: "hero.mp3" } },
    detectorConfig: {},
    timersConfig: {},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
  };
  queryClient.setQueryData(queryKey, initial);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(useUpdateSoundSettings, { wrapper });
  try {
    act(() =>
      result.current.mutate({ notificationsConfig: { HERO: { volume: 0.8 } } }),
    );
    await vi.waitFor(() => {
      expect(
        queryClient.getQueryData<SoundSettingsResponseDto>(queryKey),
      ).toEqual({
        ...initial,
        notificationsConfig: { HERO: { volume: 0.8, soundUrl: "hero.mp3" } },
      });
    });
    await act(() => response.resolve(new Response(null, { status: 500 })));
    await vi.waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(queryKey)).toEqual(initial);
  } finally {
    unmount();
    queryClient.clear();
    restoreApi();
  }
});
