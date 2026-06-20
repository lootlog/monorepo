import { BattlePanelPvpWarriorSummary } from "@/features/user/battle-panel/components/battle-panel-pvp-warrior-summary";
import type { HeadToHeadRecord } from "@/lib/api/battlelog-types";

type BattlePanelH2hOpponentSummaryProps = {
  className?: string;
  record: HeadToHeadRecord;
};

const EMPTY_WARRIOR_DAMAGE_PROFILE = {
  fireDamage: 0,
  frostDamage: 0,
  lightningDamage: 0,
  poisonDamageTaken: 0,
  woundDamageTaken: 0,
  critWoundDamageTaken: 0,
};

export function BattlePanelH2hOpponentSummary({
  className,
  record,
}: BattlePanelH2hOpponentSummaryProps) {
  const opponentWarrior = record.lastBattleOpponentWarrior ?? {
    ...EMPTY_WARRIOR_DAMAGE_PROFILE,
    name: record.opponentName,
    lvl: record.opponentLvl,
    prof: record.opponentProf,
    icon: record.opponentIcon,
  };
  const userWarrior = record.lastBattleUserWarrior ?? {
    ...EMPTY_WARRIOR_DAMAGE_PROFILE,
    name: "",
    lvl: 0,
    prof: "",
    icon: "",
  };

  return (
    <BattlePanelPvpWarriorSummary
      warrior={opponentWarrior}
      opposingWarrior={userWarrior}
      className={className}
    />
  );
}
