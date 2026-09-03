import { ItemTypeEnum, ProfessionEnum } from "@lootlog/schema/loot";
import { getItemTypeByCl } from "./item-type.js";
import { getProfByShortname, getShortnameByProf } from "./profession.js";

describe("Margonem enum mappings", () => {
  it.each([
    ["b", ProfessionEnum.BLADE_DANCER],
    ["h", ProfessionEnum.HUNTER],
    ["m", ProfessionEnum.MAGE],
    ["p", ProfessionEnum.PALADIN],
    ["t", ProfessionEnum.TRACKER],
    ["w", ProfessionEnum.WARRIOR],
  ] as const)("maps profession shortname %s", (shortname, profession) => {
    expect(getProfByShortname(shortname)).toBe(profession);
    expect(getShortnameByProf(profession)).toBe(shortname);
  });

  it("maps every persisted Margonem item class", () => {
    expect(
      Array.from({ length: 32 }, (_, index) => getItemTypeByCl(index + 1)),
    ).toEqual(Object.values(ItemTypeEnum));
  });

  it("does not invent an item type for an unknown class", () => {
    expect(getItemTypeByCl(0)).toBeUndefined();
    expect(getItemTypeByCl(33)).toBeUndefined();
  });
});
