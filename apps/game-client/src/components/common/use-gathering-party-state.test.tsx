import { act, renderHook } from "@testing-library/react";
import type { PartyGatheringPartyState } from "@lootlog/schema/party-ready-room";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useGlobalStore } from "@/store/global.store";
import { useGatheringPartyState } from "./use-gathering-party-state";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
  useGlobalStore.getState().setSocketState({ joined: true, connected: true });
});

afterEach(() => {
  vi.useRealTimers();
  useGlobalStore.setState(useGlobalStore.getInitialState(), true);
});

it("expires an unchanged observation without waiting for another render and renews it after a new game snapshot", () => {
  const partyState: PartyGatheringPartyState = {
    status: "OBSERVED",
    observedAt: new Date().toISOString(),
    members: [{ characterId: "member" }],
  };

  const { result, rerender } = renderHook(
    ({ observation }) => useGatheringPartyState(observation),
    { initialProps: { observation: partyState } },
  );

  expect(result.current.isStale).toBe(false);

  act(() => vi.advanceTimersByTime(120_001));
  expect(result.current.isStale).toBe(true);
  expect(result.current.observation?.members).toEqual([
    { characterId: "member" },
  ]);

  rerender({
    observation: { ...partyState, observedAt: new Date().toISOString() },
  });
  expect(result.current.isStale).toBe(false);
  act(() => useGlobalStore.getState().setSocketState({ joined: false }));
  expect(result.current.isStale).toBe(true);
});
