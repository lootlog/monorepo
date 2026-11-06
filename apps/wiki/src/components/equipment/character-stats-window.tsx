import { t } from "@/i18n/messages";
import { type CharacterStats, characterStats } from "@/lib/character-stats";
import type { Profession } from "@/lib/equipment-set";
import type { SkillBonuses } from "@/lib/skills/skill-stats";
import { skillPlanLevel } from "@/lib/skills/skill-tree";
import { EquipmentStatRow } from "./equipment-stat-row";
import { EquipmentStatSection } from "./equipment-stat-section";

type CharacterStatLine = {
  id: string;
  unit?: "%";
  value: (stats: CharacterStats) => number;
  /** The top of a damage range. */
  max?: (stats: CharacterStats) => number;
  /** A stat every character has keeps its row at zero; others hide. */
  always?: true;
};

const CHARACTER_SECTIONS: ReadonlyArray<{
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
      { id: "poisonChance", unit: "%", value: (stats) => stats.poison.chance },
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

type CharacterStatsWindowProps = {
  profession: Profession;
  level: number | null;
  wornItems: ReadonlyArray<{ item: { type: string | null; stat: string } }>;
  skills: SkillBonuses;
  isLoaded: boolean;
};

// Chances and attack speed keep their hundredths, as the game shows them.
const rounded = (value: number) => Math.round(value * 100) / 100;

/**
 * The whole character as the game's window shows it: what the profession
 * has at its level, with the worn items and the learned skills.
 */
export function CharacterStatsWindow({
  profession,
  level,
  wornItems,
  skills,
  isLoaded,
}: CharacterStatsWindowProps) {
  const stats = characterStats(
    profession,
    skillPlanLevel(level),
    wornItems,
    skills,
  );

  return (
    <div className="grid items-start gap-x-8 gap-y-5 @lg:grid-cols-2 @[54rem]:grid-cols-4">
      <p className="col-span-full text-xs text-pretty text-muted-foreground">
        {level === null
          ? `${t("character.hint")} ${t("character.assumedLevel")}`
          : t("character.hint")}
      </p>
      {CHARACTER_SECTIONS.map((section) => (
        <EquipmentStatSection
          key={section.id}
          id={`character-stats-${section.id}`}
          title={t(`setStats.sections.${section.id}`)}
          hidden={false}
        >
          {section.lines.map((line) => {
            const value = rounded(line.value(stats));
            const max = line.max ? rounded(line.max(stats)) : undefined;
            const isShown = line.always || value !== 0 || (max ?? 0) !== 0;

            return (
              <EquipmentStatRow
                key={line.id}
                label={t(`character.stats.${line.id}`)}
                unit={line.unit ?? ""}
                total={isShown ? value : undefined}
                rangeMax={max === undefined || max === value ? undefined : max}
                isLoaded={isLoaded}
              />
            );
          })}
        </EquipmentStatSection>
      ))}
    </div>
  );
}
