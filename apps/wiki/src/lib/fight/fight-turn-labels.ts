import { formatDecimal } from "@lootlog/domain/locale";
import { t } from "@/i18n/messages";
import { pluralForm } from "@/lib/plural";
import { skillEffectLine } from "@/lib/skills/skill-effects";
import type {
  FighterBuff,
  FighterCondition,
  NextAction,
} from "./fight-snapshot";

const OWN_BUFF_LABELS: ReadonlySet<string> = new Set([
  "rage",
  "poison_lowdmg_per",
]);

const TARGET_PREFIX = /^[^:]{1,30}:\s*/;

const capitalized = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const turnsLeftText = (turns: number | null) =>
  turns === null
    ? t("fightPage.turn.untilEnd")
    : t(`fightPage.turn.turnsLeft.${pluralForm(turns)}`, { count: turns });

export const buffLabel = ({ key, value }: FighterBuff) =>
  OWN_BUFF_LABELS.has(key)
    ? t(`fightPage.turn.buffs.${key}`, { value: formatDecimal(value) })
    : capitalized(
        skillEffectLine(key, String(value), null)
          .replace(TARGET_PREFIX, "")
          .replace(/%\w+%/g, ""),
      );

export const conditionLabel = ({ id, value }: FighterCondition) =>
  t(`fightPage.turn.conditions.${id}`, { value: formatDecimal(value) });

export const nextActionLabel = (action: NextAction) =>
  action.kind === "skill"
    ? action.name
    : t(`fightPage.turn.nextActions.${action.kind}`);
