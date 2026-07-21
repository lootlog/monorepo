import { act, renderHook } from "@testing-library/react";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyGatheringOrchestration } from "./use-party-gathering-orchestration";

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
  createPartyGathering: vi.fn(),
  getPartyGathering: vi.fn(),
  sendChatMessage: vi.fn(),
  setOpen: vi.fn(),
}));

vi.mock("@/hooks/api/use-send-chat-message", () => ({
  useSendChatMessage: () => ({ mutateAsync: mocks.sendChatMessage }),
}));

vi.mock("@/lib/api/generated/main/messaging/messaging", () => ({
  useMessagingControllerSendNotification: () => ({
    mutateAsync: mocks.createNotification,
  }),
}));

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerGet: (...args: unknown[]) =>
    mocks.getPartyGathering(...args),
  usePartyReadyRoomControllerCreate: () => ({
    mutateAsync: mocks.createPartyGathering,
  }),
}));

vi.mock("@/lib/api/generated-helpers", () => ({
  buildChatCharacterData: () => ({ nick: "Hero" }),
  buildCurrentCharacterPayload: () => ({ nick: "Hero" }),
}));

vi.mock("@/lib/game", () => ({
  Game: { hero: { nick: "Hero" } },
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: { setOpen: typeof mocks.setOpen }) => unknown,
  ) => selector({ setOpen: mocks.setOpen }),
}));

const projection: PartyReadyRoomProjection = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer-1",
  organizerCharacter: {
    accountId: "account-1",
    characterId: "character-1",
    icon: "hero.gif",
    lvl: 200,
    nick: "Hero",
    prof: "w",
  },
  guildIds: ["guild-1"],
  world: "tempest",
  status: "ACTIVE",
  revision: 1,
  createdAt: "2026-07-22T10:00:00.000Z",
  updatedAt: "2026-07-22T10:00:00.000Z",
  expiresAt: "2026-07-22T10:30:00.000Z",
  viewer: "ORGANIZER",
  participants: {},
  ownedParticipantIds: [],
};

describe("usePartyGatheringOrchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePartyFinderStore.getState().clearReadyRooms();
    mocks.createPartyGathering.mockResolvedValue(projection);
    mocks.sendChatMessage.mockResolvedValue([]);
  });

  it("uses the Ready Room organizer when publishing a chat gathering", async () => {
    const { result } = renderHook(() => usePartyGatheringOrchestration());

    await act(() =>
      result.current.startPartyGathering({
        guildIds: ["guild-1"],
        world: "tempest",
      }),
    );

    expect(mocks.sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        partyGathering: expect.objectContaining({
          discordId: "organizer-1",
          notificationId: "room-1",
        }),
      }),
    );
  });

  it("keeps the created gathering open when chat publishing fails", async () => {
    mocks.sendChatMessage.mockRejectedValue(new Error("Chat unavailable"));
    const { result } = renderHook(() => usePartyGatheringOrchestration());

    await expect(
      act(() =>
        result.current.startPartyGathering({
          guildIds: ["guild-1"],
          world: "tempest",
          closeCreateWindow: true,
        }),
      ),
    ).resolves.toEqual({
      notificationId: "room-1",
      guildIds: ["guild-1"],
    });

    expect(mocks.setOpen).toHaveBeenCalledWith("create-party-gathering", false);
    expect(mocks.setOpen).toHaveBeenCalledWith("party-finder", true);
    expect(mocks.setOpen.mock.invocationCallOrder.at(-1)).toBeLessThan(
      mocks.sendChatMessage.mock.invocationCallOrder[0] ?? 0,
    );
    expect(usePartyFinderStore.getState().projections["room-1"]).toBeDefined();
  });

  it("opens a known active gathering without creating another one", async () => {
    usePartyFinderStore.getState().mergeProjection(projection);
    const { result } = renderHook(() => usePartyGatheringOrchestration());

    const error = await act(() =>
      result.current
        .startPartyGathering({
          guildIds: ["guild-1"],
          world: "tempest",
          closeCreateWindow: true,
        })
        .catch((caughtError: unknown) => caughtError),
    );

    expect(error).toMatchObject({ code: "ACTIVE_GATHERING_EXISTS" });
    expect(mocks.createPartyGathering).not.toHaveBeenCalled();
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
    expect(mocks.setOpen).toHaveBeenCalledWith("create-party-gathering", false);
    expect(mocks.setOpen).toHaveBeenCalledWith("party-finder", true);
  });

  it("synchronizes an active gathering reported by the backend", async () => {
    const conflict = new ApiError({
      status: 409,
      data: {
        code: "ACTIVE_GATHERING_EXISTS",
        notificationId: "room-1",
      },
      url: "/messaging/party-gathering",
      method: "POST",
      message: "Conflict",
    });
    mocks.createPartyGathering.mockRejectedValue(conflict);
    mocks.getPartyGathering.mockResolvedValue(projection);
    const { result } = renderHook(() => usePartyGatheringOrchestration());

    const error = await act(() =>
      result.current
        .startPartyGathering({
          guildIds: ["guild-1"],
          world: "tempest",
        })
        .catch((caughtError: unknown) => caughtError),
    );

    expect(error).toBe(conflict);
    expect(mocks.getPartyGathering).toHaveBeenCalledWith({
      notificationId: "room-1",
    });
    expect(usePartyFinderStore.getState().projections["room-1"]).toEqual(
      projection,
    );
    expect(mocks.setOpen).toHaveBeenCalledWith("party-finder", true);
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
  });

  it("uses the fetched organizer when publishing an NPC gathering", async () => {
    mocks.createNotification.mockResolvedValue({
      notificationId: "room-1",
      guildIds: ["guild-1"],
    });
    mocks.getPartyGathering.mockResolvedValue(projection);
    const { result } = renderHook(() => usePartyGatheringOrchestration());

    await act(() =>
      result.current.startNpcPartyGathering({
        npc: {
          id: 1,
          nick: "Hydra",
          lvl: 250,
          prof: "m",
        } as never,
        guildIds: ["guild-1"],
        world: "tempest",
      }),
    );

    expect(mocks.sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        partyGathering: expect.objectContaining({
          discordId: "organizer-1",
          notificationId: "room-1",
        }),
      }),
    );
  });
});
