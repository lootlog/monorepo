import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useSettingsStore } from "@/store/settings.store";

const mocks = vi.hoisted(() => ({
  emitWithAck: vi.fn(),
  socketOff: vi.fn(),
  socketOn: vi.fn(),
  socket: {
    emitWithAck: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    timeout() {
      return this;
    },
  },
  useGuildMembersSummary: vi.fn((..._arguments: unknown[]) => ({
    data: undefined,
  })),
}));

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => ({
    connected: true,
    joined: true,
    socket: mocks.socket,
  }),
}));

vi.mock("@/hooks/api/guild-members-summary-query", () => ({
  useGuildMembersSummary: (...arguments_: unknown[]) =>
    mocks.useGuildMembersSummary(...arguments_),
}));

import { useOnlineCharacterOwners } from "./use-online-character-owners";

describe("useOnlineCharacterOwners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.socket.emitWithAck = mocks.emitWithAck;
    mocks.socket.off = mocks.socketOff;
    mocks.socket.on = mocks.socketOn;
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    useSettingsStore.setState({
      guildIdByCharId: { "hero-1": "guild-1" },
      worldByGuildId: { "guild-1": "tempest" },
    });
    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: {
        hero: { d: { id: "hero-1" } },
      },
    });
    mocks.emitWithAck.mockResolvedValue({
      status: "success",
      players: {},
    });
  });

  it("does no owner query or socket work until Shift is pressed", async () => {
    renderHook(() => useOnlineCharacterOwners());

    expect(mocks.emitWithAck).not.toHaveBeenCalled();
    expect(mocks.socketOn).not.toHaveBeenCalled();
    expect(mocks.useGuildMembersSummary).toHaveBeenLastCalledWith(
      { guildId: "guild-1" },
      expect.objectContaining({
        query: expect.objectContaining({ enabled: false }),
      }),
    );

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.emitWithAck).toHaveBeenCalledWith(
        GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH,
        { guildId: "guild-1", world: "tempest" },
      );
      expect(mocks.socketOn).toHaveBeenCalledWith(
        GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
        expect.any(Function),
      );
      expect(mocks.useGuildMembersSummary).toHaveBeenLastCalledWith(
        { guildId: "guild-1" },
        expect.objectContaining({
          query: expect.objectContaining({ enabled: true }),
        }),
      );
    });
  });

  it("retries a failed acknowledgement and permits a fresh Shift activation", async () => {
    mocks.emitWithAck.mockRejectedValue(new Error("ack timeout"));
    renderHook(() => useOnlineCharacterOwners());
    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.emitWithAck).toHaveBeenCalledTimes(2);
      expect(useOnlineCharacterOwnersStore.getState().status).toBe("error");
    });

    mocks.emitWithAck.mockResolvedValue({ status: "success", players: {} });
    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    });
    await waitFor(() => {
      expect(mocks.socketOff).toHaveBeenCalledWith(
        GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
        expect.any(Function),
      );
    });
    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(mocks.emitWithAck).toHaveBeenCalledTimes(3);
      expect(useOnlineCharacterOwnersStore.getState().status).toBe("success");
    });
  });
});
