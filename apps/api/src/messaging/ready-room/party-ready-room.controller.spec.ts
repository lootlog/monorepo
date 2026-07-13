import { describe, expect, it, vi } from "vitest";
import { PartyReadyRoomController } from "src/messaging/ready-room/party-ready-room.controller";

describe("PartyReadyRoomController", () => {
  it("creates through ReadyRoomService with only authorized selected guilds", async () => {
    const readyRoomService = {
      create: vi
        .fn<(command: unknown) => Promise<unknown>>()
        .mockResolvedValue({
          notificationId: "room-1",
          viewer: "ORGANIZER",
        }),
    };
    const guildsService = {
      getGuildsForRequiredPermissions: vi
        .fn<
          (
            discordId: string,
            permissions: unknown[],
          ) => Promise<Array<{ id: string }>>
        >()
        .mockResolvedValue([{ id: "guild-1" }, { id: "guild-3" }]),
    };
    const controller = new PartyReadyRoomController(
      readyRoomService as never,
      guildsService as never,
    );

    await expect(
      controller.create("organizer", {
        guildIds: ["guild-1", "guild-2"],
        world: "Fobos",
        character: {
          accountId: "account",
          characterId: "character",
          icon: "character.gif",
          lvl: 200,
          nick: "Organizer",
          prof: "w",
        },
      }),
    ).resolves.toMatchObject({ notificationId: "room-1" });
    expect(readyRoomService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerDiscordId: "organizer",
        guildIds: ["guild-1"],
      }),
    );
  });

  it("reserves invite-all commands without invoking any game action", async () => {
    const readyRoomService = {
      get: vi
        .fn<(command: unknown) => Promise<unknown>>()
        .mockResolvedValue({}),
      reserveInvitations: vi
        .fn<(command: unknown) => Promise<unknown>>()
        .mockResolvedValue({ batch: { batchId: "batch-1", reservations: [] } }),
    };
    const guildsService = {
      getGuildsForRequiredPermissions: vi
        .fn<
          (
            discordId: string,
            permissions: unknown[],
          ) => Promise<Array<{ id: string }>>
        >()
        .mockResolvedValue([{ id: "guild-1" }]),
    };
    const controller = new PartyReadyRoomController(
      readyRoomService as never,
      guildsService as never,
    );

    await controller.reserveInvitations("organizer", "room-1", {
      expectedRevision: 4,
      participantDiscordIds: ["participant-1", "participant-2"],
    });

    expect(readyRoomService.reserveInvitations).toHaveBeenCalledWith({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      expectedRevision: 4,
      participantDiscordIds: ["participant-1", "participant-2"],
    });
  });

  it("delegates explicit invitation reconciliation without a game action", async () => {
    const readyRoomService = {
      get: vi
        .fn<(command: unknown) => Promise<unknown>>()
        .mockResolvedValue({}),
      reconcileInvitation: vi
        .fn<(command: unknown) => Promise<unknown>>()
        .mockResolvedValue({ notificationId: "room-1", revision: 6 }),
    };
    const guildsService = {
      getGuildsForRequiredPermissions: vi
        .fn<
          (
            discordId: string,
            permissions: unknown[],
          ) => Promise<Array<{ id: string }>>
        >()
        .mockResolvedValue([{ id: "guild-1" }]),
    };
    const controller = new PartyReadyRoomController(
      readyRoomService as never,
      guildsService as never,
    );

    await controller.reconcileInvitation("organizer", "room-1", {
      participantDiscordId: "participant",
      commandId: "command-1",
      expectedRevision: 5,
      outcome: "NOT_MARKED",
    });

    expect(readyRoomService.reconcileInvitation).toHaveBeenCalledWith({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantDiscordId: "participant",
      commandId: "command-1",
      expectedRevision: 5,
      outcome: "NOT_MARKED",
    });
  });
});
