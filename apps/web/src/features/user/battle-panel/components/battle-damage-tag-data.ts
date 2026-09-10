import { BATTLE_BADGE_COLORS } from "@/components/battle/utils/battle-color-palette";
import {
  Biohazard,
  Flame,
  HeartCrack,
  Snowflake,
  Zap,
  type LucideIcon,
} from "lucide-react";

type BattleDamageTagKey = "fire" | "frost" | "lightning" | "poison" | "wound";

export type BattleDamageTagWarrior = {
  critWoundDamageTaken?: number | null;
  fireDamage?: number | null;
  frostDamage?: number | null;
  lightningDamage?: number | null;
  poisonDamageTaken?: number | null;
  woundDamageTaken?: number | null;
};

type BattleDamageTag = {
  badgeClassName: string;
  icon: LucideIcon;
  key: BattleDamageTagKey;
};

const DAMAGE_TAG_CONFIG: Record<
  BattleDamageTagKey,
  Pick<BattleDamageTag, "badgeClassName" | "icon">
> = {
  fire: {
    badgeClassName: BATTLE_BADGE_COLORS.damage.fire,
    icon: Flame,
  },
  frost: {
    badgeClassName: BATTLE_BADGE_COLORS.damage.frost,
    icon: Snowflake,
  },
  lightning: {
    badgeClassName: BATTLE_BADGE_COLORS.damage.lightning,
    icon: Zap,
  },
  poison: {
    badgeClassName: BATTLE_BADGE_COLORS.damage.poison,
    icon: Biohazard,
  },
  wound: {
    badgeClassName: BATTLE_BADGE_COLORS.damage.wound,
    icon: HeartCrack,
  },
};

const sumWarriorValues = (
  warriors: BattleDamageTagWarrior[],
  getValue: (warrior: BattleDamageTagWarrior) => number | null | undefined,
) =>
  warriors.reduce((total, warrior) => {
    const value = getValue(warrior);
    const safeValue =
      value !== null && value !== undefined && Number.isFinite(value)
        ? value
        : 0;

    return total + safeValue;
  }, 0);

export const getBattleDamageTags = (
  team: BattleDamageTagWarrior[],
  opposingTeam: BattleDamageTagWarrior[],
) => {
  const tags: BattleDamageTag[] = [];

  if (sumWarriorValues(team, (warrior) => warrior.fireDamage) > 0) {
    tags.push({ key: "fire", ...DAMAGE_TAG_CONFIG.fire });
  }

  if (sumWarriorValues(team, (warrior) => warrior.frostDamage) > 0) {
    tags.push({ key: "frost", ...DAMAGE_TAG_CONFIG.frost });
  }

  if (sumWarriorValues(team, (warrior) => warrior.lightningDamage) > 0) {
    tags.push({ key: "lightning", ...DAMAGE_TAG_CONFIG.lightning });
  }

  if (
    sumWarriorValues(opposingTeam, (warrior) => warrior.poisonDamageTaken) > 0
  ) {
    tags.push({ key: "poison", ...DAMAGE_TAG_CONFIG.poison });
  }

  if (
    sumWarriorValues(
      opposingTeam,
      (warrior) =>
        (warrior.woundDamageTaken ?? 0) + (warrior.critWoundDamageTaken ?? 0),
    ) > 0
  ) {
    tags.push({ key: "wound", ...DAMAGE_TAG_CONFIG.wound });
  }

  return tags;
};
