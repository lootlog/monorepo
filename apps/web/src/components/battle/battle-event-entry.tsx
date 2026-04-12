import { BattleLogAttackActions } from "./actions/battle-log-attack-action";
import type { FC } from "react";
import { parseActions } from "./utils/battle-actions-parser";
import { BattleBuffActions } from "./actions/battle-buff-actions";
import { BattleOutcomeActions } from "./actions/battle-outcome-actions";
import { BattlePassiveActions } from "./actions/battle-passive-actions";
import { BattleSpellActions } from "./actions/battle-spell-actions";
import { BattleSystemActions } from "./actions/battle-system-actions";
import type { Warrior } from "@/hooks/api/battle-log/use-battles";
import type { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";

export type BattleEventEntryProps = {
  event: RawBattleParsedEvent;
  attacker?: Warrior;
  defender?: Warrior;
  eventIndex: number;
  userTeam?: number;
};

export const BattleEventEntry: FC<BattleEventEntryProps> = ({
  event,
  attacker,
  defender,
  eventIndex,
  userTeam,
}) => {
  const parsedActions = parseActions(event.actions);

  return (
    <li className="border-b-2 border-transparent">
      <BattleBuffActions
        actions={parsedActions.buffActions}
        attacker={attacker}
        event={event}
        eventIndex={eventIndex}
      />

      <BattleSystemActions
        actions={parsedActions.systemActions}
        attacker={attacker}
        event={event}
        eventIndex={eventIndex}
      />

      <BattleSpellActions
        actions={parsedActions.spellActions}
        attacker={attacker}
        defender={defender}
        event={event}
        eventIndex={eventIndex}
        userTeam={userTeam}
      />

      <BattleLogAttackActions
        attacker={attacker}
        defender={defender}
        actions={parsedActions.attackActions}
        event={event}
        userTeam={userTeam}
      />

      <BattlePassiveActions
        actions={parsedActions.passiveActions}
        attacker={attacker}
        event={event}
        eventIndex={eventIndex}
        userTeam={userTeam}
      />

      <BattleOutcomeActions
        actions={parsedActions.outcomeActions}
        attacker={attacker}
        event={event}
        eventIndex={eventIndex}
      />
    </li>
  );
};
