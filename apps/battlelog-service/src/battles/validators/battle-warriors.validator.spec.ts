import "reflect-metadata";
import { validate } from "class-validator";
import { CreateBattleFightEventDto } from "../dto/create-battle.dto";

describe("ValidateWarriorsRecord", () => {
  let dto: CreateBattleFightEventDto;

  beforeEach(() => {
    dto = new CreateBattleFightEventDto();
  });

  it("should accept valid warriors record with two teams", async () => {
    dto.w = {
      "1": {
        originalId: 101,
        name: "Warrior1",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: "Warrior2",
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 2,
      },
    };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should reject warriors record with only one team", async () => {
    dto.w = {
      "1": {
        originalId: 101,
        name: "Warrior1",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: "Warrior2",
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 1,
      },
    };

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("w");
  });

  it("should reject NPC warriors (negative IDs)", async () => {
    dto.w = {
      "-1": {
        originalId: -101,
        name: "NPC",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: "Warrior2",
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 2,
      },
    };

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("w");
  });

  it("should reject invalid warrior data", async () => {
    dto.w = {
      "1": {
        originalId: 101,
        name: "Warrior1",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: 123 as any,
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 2,
      },
    };

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("should reject non-object values", async () => {
    dto.w = "not an object" as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("w");
  });

  it("should accept undefined values (field is optional)", async () => {
    dto.w = undefined;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should accept warriors from different teams", async () => {
    dto.w = {
      "1": {
        originalId: 101,
        name: "Warrior1",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: "Warrior2",
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 1,
      },
      "3": {
        originalId: 103,
        name: "Warrior3",
        lvl: 48,
        prof: "m",
        icon: "icon3",
        team: 2,
      },
    };

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("should reject empty warriors record", async () => {
    dto.w = {};

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
