import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getTimerSettingsControllerGetGlobalSettingsQueryKey,
  type TimerSettingsResponseDto,
} from "@lootlog/client/main";
import type { PropsWithChildren } from "react";
import { beforeEach, expect, it, onTestFinished } from "vitest";
import { useTimersStore, TIMERS_STORAGE_KEY } from "@/store/timers.store";
import { useTimerSettingsSync } from "./use-timer-settings-sync";

const remoteSettings: TimerSettingsResponseDto = {
  userId: "user-1",
  generalConfig: { compactView: true, customFutureSetting: { enabled: true } },
  displayConfig: { fontSize: 15 },
  customColors: {},
  timersColors: { Tanroth: "red" },
  alwaysVisibleExpiredTimers: { pandora: ["timer-1"] },
  defaultColorNames: { red: "Bosses" },
  overriddenDefaultColors: {},
  hiddenDefaultColors: [],
  timerFiltersEnabled: true,
  colorFiltersEnabled: false,
  timersSortOrder: "desc",
  syncEnabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

beforeEach(() => {
  useTimersStore.setState(useTimersStore.getInitialState(), true);
  localStorage.removeItem(TIMERS_STORAGE_KEY);
});

const mountSync = (remote: TimerSettingsResponseDto) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  queryClient.setQueryData(
    getTimerSettingsControllerGetGlobalSettingsQueryKey(),
    remote,
  );

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const view = renderHook(useTimerSettingsSync, { wrapper: Wrapper });
  onTestFinished(() => {
    view.unmount();
    queryClient.clear();
  });
};

it("applies partial server settings without losing defaults or extension fields", async () => {
  const initial = useTimersStore.getState();
  mountSync(remoteSettings);
  await waitFor(() =>
    expect(useTimersStore.getState().generalConfig.compactView).toBe(true),
  );
  expect(useTimersStore.getState().generalConfig).toEqual({
    ...initial.generalConfig,
    compactView: true,
    customFutureSetting: { enabled: true },
  });
  expect(useTimersStore.getState().displayConfig).toEqual({
    ...initial.displayConfig,
    fontSize: 15,
  });
  expect(useTimersStore.getState().timersColors).toEqual({ Tanroth: "red" });
  expect(useTimersStore.getState().alwaysVisibleExpiredTimers).toEqual({
    pandora: ["timer-1"],
  });
  expect(useTimersStore.getState().updatedAt).toBe(
    Date.parse(remoteSettings.updatedAt),
  );
});

it("keeps valid local settings when individual server documents are malformed", async () => {
  useTimersStore.setState({
    timersColors: { Tanroth: "blue" },
    hiddenTimers: { "guild-1": ["timer-2"] },
  });
  const initial = useTimersStore.getState();
  mountSync({
    ...remoteSettings,
    generalConfig: null,
    displayConfig: "broken",
    timersColors: { Tanroth: 42 },
  });
  await waitFor(() =>
    expect(useTimersStore.getState().timersSortOrder).toBe("desc"),
  );
  expect(useTimersStore.getState().generalConfig).toEqual(
    initial.generalConfig,
  );
  expect(useTimersStore.getState().displayConfig).toEqual(
    initial.displayConfig,
  );
  expect(useTimersStore.getState().timersColors).toEqual({ Tanroth: "blue" });
  expect(useTimersStore.getState().hiddenTimers).toEqual({
    "guild-1": ["timer-2"],
  });
});

it("rehydrates partial legacy settings, preserves extensions on write and protects live actions", async () => {
  const initial = useTimersStore.getState();
  localStorage.setItem(
    TIMERS_STORAGE_KEY,
    JSON.stringify({
      version: 6,
      state: {
        generalConfig: { compactView: true, customFutureSetting: "keep" },
        displayConfig: { fontSize: 17 },
        hiddenTimers: { "guild-1": ["timer-1"] },
        timersColors: { Tanroth: 42 },
        setGeneralConfig: "not a function",
      },
    }),
  );
  await useTimersStore.persist.rehydrate();
  const hydrated = useTimersStore.getState();
  expect(hydrated.generalConfig).toEqual({
    ...initial.generalConfig,
    compactView: true,
    customFutureSetting: "keep",
  });
  expect(hydrated.displayConfig).toEqual({
    ...initial.displayConfig,
    fontSize: 17,
  });
  expect(hydrated.hiddenTimers).toEqual({ "guild-1": ["timer-1"] });
  expect(hydrated.timersColors).toEqual({});
  expect(hydrated.setGeneralConfig).toBe(initial.setGeneralConfig);
  hydrated.setTimerFiltersSearchText("boss");
  expect(
    JSON.parse(localStorage.getItem(TIMERS_STORAGE_KEY) ?? "null"),
  ).toMatchObject({
    state: {
      generalConfig: { customFutureSetting: "keep", compactView: true },
      displayConfig: { fontSize: 17 },
    },
  });
});
