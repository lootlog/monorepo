import { t } from "@/i18n/messages";
import { SKILL_EFFECT_TEMPLATES } from "@/lib/skills/skill-effect-templates";
import { parseSkillRank, skillValueAt } from "@/lib/skills/skill-tree";

/**
 * How the game's skill window words one stat: its dictionary line and how
 * the value goes into it. `percent100` shows a fraction as a percentage,
 * `signed` adds a plus, and `pair` fills the line with both halves of `a/b`.
 */
export type SkillEffectTemplate = {
  template: string;
  value: "plain" | "signed" | "percent100" | "pair";
  /** The line names the value in percentage points after it. */
  percentPoints?: boolean;
};

// Stats the game words with "przez" before the turns instead of "na".
const LASTING_STATS = new Set([
  "en-regen",
  "lightshield_per",
  "resfire_per",
  "resfrost_per",
  "reslight_per",
  "antidote",
  "dmg_evade_hpp-target_light",
  "energyout",
  "immunity_to_dmg",
]);

const TEMPLATES = new Map<string, SkillEffectTemplate>(
  Object.entries(SKILL_EFFECT_TEMPLATES),
);

const formatNumber = (value: number) =>
  value.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

const signed = (value: number) =>
  `${value >= 0 ? "+" : ""}${formatNumber(value)}`;

/** Polish takes one form for 1, another for 2–4 and a third from 5. */
const pluralForm = (count: number) =>
  count === 1 ? "one" : count > 1 && count < 5 ? "few" : "many";

const turnsText = (count: number) => t(`skills.turns.${pluralForm(count)}`);

const percentPointsText = (value: number) =>
  t(`skills.percentPoints.${pluralForm(Math.trunc(value))}`);

const shown = (raw: string, level: number | null) => {
  const value = skillValueAt(raw, level);

  return value === undefined ? raw : formatNumber(value);
};

/**
 * One stat of a rank as the game's skill window words it, with `*lvl`
 * values worked out for the level. A stat the game has no line for keeps
 * its raw name and value.
 */
export const skillEffectLine = (
  key: string,
  raw: string,
  level: number | null,
) => {
  const template = TEMPLATES.get(key);

  if (!template) return `${key}: ${raw}`;

  const [valuePart = "", turns] = raw.split("@");
  const [first = "", second = ""] = valuePart.split("/");
  const value = skillValueAt(first, level);

  const formatted =
    value === undefined
      ? first
      : template.value === "percent100"
        ? signed(Math.floor(value * 100))
        : template.value === "signed"
          ? signed(value)
          : formatNumber(value);

  const values = new Map([
    ["%val%", formatted],
    ["%val2%", template.value === "pair" ? shown(second, level) : ""],
    [
      "%val3%",
      template.percentPoints && value !== undefined
        ? percentPointsText(value)
        : "",
    ],
  ]);

  const text = template.template
    // The window's comparison with the next rank sits in a span.
    .replace(/<span>[^<]*<\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/%val\d?%/g, (placeholder) => values.get(placeholder) ?? "")
    .replace(/%damage_mode(?:_lower)?%/g, "");

  const turnCount = Number(turns);

  const lasting = Number.isInteger(turnCount)
    ? ` ${LASTING_STATS.has(key) ? t("skills.during") : t("skills.for")} ${turnCount} ${turnsText(turnCount)}`
    : "";

  const cooldown =
    key === "cooldown" && value !== undefined
      ? ` ${t(`skills.cooldownTurns.${pluralForm(value)}`)}`
      : "";

  const perLevel = first.endsWith("*lvl") ? ` ${t("skills.perLevel")}` : "";

  return `${text}${cooldown}${lasting}${perLevel}`.replace(/\s+/g, " ").trim();
};

/** Every stat of a rank as lines of the game's skill window. */
export const skillEffectLines = (rank: string, level: number | null) =>
  [...parseSkillRank(rank)].map(([key, raw]) =>
    skillEffectLine(key, raw, level),
  );
