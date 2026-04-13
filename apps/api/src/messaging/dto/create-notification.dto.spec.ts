import { CreateNotificationDto } from "./create-notification.dto";

describe("CreateNotificationDto", () => {
  it("keeps npc coordinates when present", () => {
    const result = CreateNotificationDto.schema.parse({
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
});
