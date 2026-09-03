import { CreateNotificationDto } from "#src/http-api/contracts/messaging/schemas";
import { Result, Schema } from "effect";

describe("CreateNotificationDto", () => {
  it("keeps npc coordinates when present", () => {
    const result = Schema.decodeUnknownSync(CreateNotificationDto)({
      npc: {
        id: 911169,
        hpp: 0,
        location: "Glusza Swistu",
        name: "Debug Tytan #228",
        wt: 102,
        x: 10,
        y: 10,
        lvl: 306,
        prof: "h",
        icon: "tyt/maddok-tytan2.gif",
        type: 2,
      },
      world: "gordion",
      guildIds: ["1399076174654603284", "1317554700853444709"],
    });

    expect(result.npc?.x).toBe(10);
    expect(result.npc?.y).toBe(10);
  });

  it("requires the organizer character for party gathering notifications", () => {
    const result = Schema.decodeUnknownResult(CreateNotificationDto)({
      npc: {
        id: 911169,
        location: "Glusza Swistu",
        name: "Debug Tytan #228",
        wt: 102,
        lvl: 306,
        icon: "tyt/maddok-tytan2.gif",
        type: 2,
      },
      world: "gordion",
      guildIds: ["guild-1"],
      isGatheringParty: true,
    });

    expect(Result.isFailure(result)).toBe(true);
  });

  it("accepts a party gathering notification with an organizer character", () => {
    const result = Schema.decodeUnknownResult(CreateNotificationDto)({
      npc: {
        id: 911169,
        location: "Glusza Swistu",
        name: "Debug Tytan #228",
        wt: 102,
        lvl: 306,
        icon: "tyt/maddok-tytan2.gif",
        type: 2,
      },
      world: "gordion",
      guildIds: ["guild-1"],
      isGatheringParty: true,
      character: {
        lvl: 250,
        nick: "Organizer",
        accountId: "account-1",
        characterId: "character-1",
        prof: "w",
        icon: "organizer.gif",
      },
    });

    expect(Result.isSuccess(result)).toBe(true);
  });
});
