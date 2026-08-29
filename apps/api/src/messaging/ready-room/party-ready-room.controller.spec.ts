import { describe, expect, it, vi } from "vitest";
import { PartyReadyRoomController } from "#src/messaging/ready-room/party-ready-room.controller";

function createGuildsService() {
  return {
    getGuildsForRequiredPermissions: vi
      .fn<
        (
          discordId: string,
          permissions: unknown[],
        ) => Promise<Array<{ id: string }>>
      >()
      .mockResolvedValue([{ id: "guild-1" }, { id: "guild-3" }]),
  };
}

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
    const controller = new PartyReadyRoomController(
      readyRoomService as never,
      createGuildsService() as never,
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

  it("turns an application directly into a join command", async () => {
    const readyRoomService = {
      join: vi.fn<(command: unknown) => Promise<unknown>>().mockResolvedValue({
        notificationId: "room-1",
        viewer: "PARTICIPANT",
      }),
    };
    const controller = new PartyReadyRoomController(
      readyRoomService as never,
      createGuildsService() as never,
    );
    const character = {
      accountId: "account",
      characterId: "character",
      icon: "character.gif",
      lvl: 190,
      nick: "Participant",
      prof: "m",
    };

    await controller.apply("participant", "room-1", {
      world: "Fobos",
      character,
    });

    expect(readyRoomService.join).toHaveBeenCalledWith({
      notificationId: "room-1",
      participantDiscordId: "participant",
      character,
      world: "Fobos",
      accessibleGuildIds: ["guild-1", "guild-3"],
    });
  });

  it("resolves explicit invitation targets without recording invite state", async () => {
    const readyRoomService = {
      get: vi
        .fn<(command: unknown) => Promise<unknown>>()
        .mockResolvedValue({}),
      resolveInvitationTargets: vi
        .fn<(command: unknown) => Promise<unknown>>()
        .mockResolvedValue({
          targets: [
            {
              participantId: "participant-1",
              characterId: "character-1",
            },
          ],
        }),
    };
    const controller = new PartyReadyRoomController(
      readyRoomService as never,
      createGuildsService() as never,
    );

    await controller.resolveInvitationTargets("organizer", "room-1", {
      participantIds: ["participant-1", "participant-1"],
    });

    expect(readyRoomService.resolveInvitationTargets).toHaveBeenCalledWith({
      notificationId: "room-1",
      organizerDiscordId: "organizer",
      participantIds: ["participant-1", "participant-1"],
    });
  });
});
