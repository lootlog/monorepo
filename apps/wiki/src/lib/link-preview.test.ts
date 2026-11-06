import { describe, expect, it } from "vitest";
import type {
  CatalogItemDtoOutput,
  CatalogNpcDtoOutput,
} from "@lootlog/client/search";
import { NO_UPGRADE } from "@lootlog/domain/item-upgrade";
import { itemLinkPreview, npcLinkPreview } from "./link-preview";

const source = (name: string, retired = false) => ({
  key: `pl_template_${name}`,
  id: 1,
  name,
  lvl: 100,
  icon: null,
  type: "HERO",
  retired,
});

const item = (
  name: string,
  rarity: string,
  droppedBy: ReturnType<typeof source>[],
): CatalogItemDtoOutput => ({
  id: 1,
  name,
  icon: "",
  stat: "",
  lvl: 100,
  rarity,
  type: null,
  droppedBy,
  elasticLevel: false,
});

const npc: CatalogNpcDtoOutput = {
  key: "pl_template_Tanroth",
  id: 1,
  name: "Tanroth",
  icon: "",
  lvl: 300,
  type: "HERO",
  gameVersion: "pl",
  locations: [],
  formerLevels: [],
};

describe("itemLinkPreview", () => {
  it("names each monster the item still drops from once", () => {
    const preview = itemLinkPreview(
      item("Dłonie", "LEGENDARY", [
        source("Tanroth"),
        source("Tanroth"),
        source("Grabarz", true),
      ]),
      { upgrade: NO_UPGRADE },
    );

    expect(preview.lines.at(-1)).toBe("Wypada z: Tanroth");
  });
});

describe("npcLinkPreview", () => {
  it("lists current drops the most valuable first, without retired ones", () => {
    const preview = npcLinkPreview(npc, [
      item("Zwykły", "COMMON", [source("Tanroth")]),
      item("Dawny", "LEGENDARY", [source("Tanroth", true)]),
      item("Heroiczny", "HEROIC", [source("Tanroth")]),
      item("Legendarny", "LEGENDARY", [source("Tanroth")]),
    ]);

    expect(preview.lines.at(-1)).toBe("Dropy: Legendarny, Heroiczny, Zwykły");
  });
});
