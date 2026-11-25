import type { CharacterStats } from "@/lib/character-stats";

type CharacterStatLine = {
  id: string;
  unit?: "%";
  value: (stats: CharacterStats) => number;
  max?: (stats: CharacterStats) => number;
  always?: true;
};

export const CHARACTER_STAT_SECTIONS: ReadonlyArray<{
  id: "attack" | "defence" | "power" | "basic";
  lines: readonly CharacterStatLine[];
}> = [
  {
    id: "attack",
    lines: [
      {
        id: "physical",
        value: (stats) => stats.physical.min,
        max: (stats) => stats.physical.max,
        always: true,
      },
      {
        id: "offhand",
        value: (stats) => stats.offhand.min,
        max: (stats) => stats.offhand.max,
      },
      {
        id: "fire",
        value: (stats) => stats.fire.min,
        max: (stats) => stats.fire.max,
      },
      {
        id: "light",
        value: (stats) => stats.light.min,
        max: (stats) => stats.light.max,
      },
      {
        id: "frost",
        value: (stats) => stats.frost.min,
        max: (stats) => stats.frost.max,
      },
      { id: "poison", value: (stats) => stats.poison.damage },
      { id: "poisonSlow", value: (stats) => stats.poison.slow },
      { id: "wound", value: (stats) => stats.wound.damage },
      { id: "woundChance", unit: "%", value: (stats) => stats.wound.chance },
      { id: "attackSpeed", value: (stats) => stats.attackSpeed, always: true },
      {
        id: "critChance",
        unit: "%",
        value: (stats) => stats.critChance,
        always: true,
      },
      {
        id: "critValue",
        unit: "%",
        value: (stats) => stats.critValue,
        always: true,
      },
      {
        id: "critMagicValue",
        unit: "%",
        value: (stats) => stats.critMagicValue,
        always: true,
      },
      { id: "pierce", unit: "%", value: (stats) => stats.pierce },
    ],
  },
  {
    id: "defence",
    lines: [
      { id: "armor", value: (stats) => stats.armor, always: true },
      { id: "evadePoints", value: (stats) => stats.evadePoints, always: true },
      {
        id: "evadeChance",
        unit: "%",
        value: (stats) => stats.evadeChance,
        always: true,
      },
      { id: "blockPoints", value: (stats) => stats.blockPoints },
      { id: "blockChance", unit: "%", value: (stats) => stats.blockChance },
      { id: "absorb", value: (stats) => stats.absorb },
      { id: "absorbMagic", value: (stats) => stats.absorbMagic },
      { id: "absorbLimit", value: (stats) => stats.absorbLimit },
      { id: "resFire", unit: "%", value: (stats) => stats.resFire },
      { id: "resLight", unit: "%", value: (stats) => stats.resLight },
      { id: "resFrost", unit: "%", value: (stats) => stats.resFrost },
      { id: "healing", value: (stats) => stats.healing },
    ],
  },
  {
    id: "power",
    lines: [
      { id: "mana", value: (stats) => stats.mana },
      { id: "energy", value: (stats) => stats.energy, always: true },
    ],
  },
  {
    id: "basic",
    lines: [
      { id: "hp", value: (stats) => stats.hp, always: true },
      { id: "strength", value: (stats) => stats.strength, always: true },
      { id: "agility", value: (stats) => stats.agility, always: true },
      { id: "intellect", value: (stats) => stats.intellect, always: true },
    ],
  },
];
