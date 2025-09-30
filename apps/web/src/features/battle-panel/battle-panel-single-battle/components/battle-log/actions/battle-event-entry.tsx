import { BattleLogAttackActions } from "@/features/battle-panel/battle-panel-single-battle/components/battle-log/actions/battle-log-attack-action";
import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { FC, memo, useMemo } from "react";
import { parseActions } from "./battle-actions-parser";
import { BattleBuffActions } from "./battle-buff-actions";
import { BattleOutcomeActions } from "./battle-outcome-actions";
import { BattlePassiveActions } from "./battle-passive-actions";
import { BattleSpellActions } from "./battle-spell-actions";
import { BattleSystemActions } from "./battle-system-actions";

export type BattleEventEntryProps = {
  event: RawBattleParsedEvent;
  attacker?: Warrior;
  defender?: Warrior;
  eventIndex: number;
  userTeam?: number;
};

export const BattleEventEntry: FC<BattleEventEntryProps> = memo(
  ({ event, attacker, defender, eventIndex, userTeam }) => {
    const parsedActions = useMemo(
      () => parseActions(event.actions),
      [event.actions]
    );

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
  }
);

BattleEventEntry.displayName = "BattleEventEntry";
