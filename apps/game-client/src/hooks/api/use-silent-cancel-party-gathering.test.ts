import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSilentCancelPartyGathering } from "./use-silent-cancel-party-gathering";
import { usePartyFinderStore } from "@/store/party-finder.store";

const mockCancelPartyGathering = vi.fn();

vi.mock("@/api", () => ({
  cancelPartyGathering: (...args: unknown[]) =>
    mockCancelPartyGathering(...args),
}));

vi.mock("@/lib/game", () => ({
  Game: { hero: { nick: "TestPlayer" } },
}));

describe("useSilentCancelPartyGathering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    usePartyFinderStore.setState({
      partyGathering: {
        notificationId: "notif-123",
        discordId: "user-1",
        character: {
          nick: "Test",
          lvl: 100,
          prof: "w",
          characterId: "1",
          accountId: "1",
          icon: "test.gif",
        },
        world: "pandora",
        createdAt: new Date().toISOString(),
      },
      chatMessageIds: { "guild-1": "msg-1" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates guild chat messages and clears party finder state", async () => {
    mockCancelPartyGathering.mockResolvedValue({
      success: true,
      guildIds: ["guild-1"],
      requestSummary: {
        totalRequests: 2,
        successCount: 2,
        failureCount: 0,
      },
    });

    const { result } = renderHook(() => useSilentCancelPartyGathering());

    await result.current();

    expect(mockCancelPartyGathering).toHaveBeenCalledWith(
      expect.objectContaining({
        partyGathering: expect.objectContaining({
          notificationId: "notif-123",
        }),
        chatMessageIds: { "guild-1": "msg-1" },
      }),
    );
    expect(usePartyFinderStore.getState().partyGathering).toBeNull();
    expect(usePartyFinderStore.getState().chatMessageIds).toEqual({});
  });

  it("swallows API errors but still clears party finder state", async () => {
    const apiError = new Error("request failed");
    mockCancelPartyGathering.mockRejectedValue(apiError);

    const { result } = renderHook(() => useSilentCancelPartyGathering());

    await expect(result.current()).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith(
      "Silent cancel failed:",
      apiError,
    );
    expect(usePartyFinderStore.getState().partyGathering).toBeNull();
    expect(usePartyFinderStore.getState().chatMessageIds).toEqual({});
  });
});
