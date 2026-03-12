import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSilentCancelPartyGathering } from "./use-silent-cancel-party-gathering";
import { usePartyFinderStore } from "@/store/party-finder.store";

const mockDelete = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/hooks/api/use-api-client", () => ({
  useAuthenticatedApiClient: () => ({
    client: { delete: mockDelete, patch: mockPatch },
  }),
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
    mockDelete.mockResolvedValue({
      status: 200,
      data: { success: true, guildIds: ["guild-1"] },
    });
    mockPatch.mockResolvedValue({});

    const { result } = renderHook(() => useSilentCancelPartyGathering());

    await result.current();

    expect(mockDelete).toHaveBeenCalledWith(
      "/notifications/party-gathering/notif-123",
    );
    expect(mockPatch).toHaveBeenCalledWith(
      "/guilds/guild-1/chat-messages/msg-1",
      { message: "TestPlayer zakończył zbieranie grupy" },
    );
    expect(usePartyFinderStore.getState().partyGathering).toBeNull();
    expect(usePartyFinderStore.getState().chatMessageIds).toEqual({});
  });

  it("swallows API errors but still clears party finder state", async () => {
    const apiError = new Error("request failed");
    mockDelete.mockRejectedValue(apiError);

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
