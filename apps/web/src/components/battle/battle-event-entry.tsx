import { BattleLogAttackActions } from "./actions/battle-log-attack-action";
import { SharedRawBattleParsedEvent, SharedWarrior } from "./types/battle";
import { FC, memo, useMemo } from "react";
import { parseActions } from "./utils/battle-actions-parser";
import { BattleBuffActions } from "./actions/battle-buff-actions";
import { BattleOutcomeActions } from "./actions/battle-outcome-actions";
import { BattlePassiveActions } from "./actions/battle-passive-actions";
import { BattleSpellActions } from "./actions/battle-spell-actions";
import { BattleSystemActions } from "./actions/battle-system-actions";

export type BattleEventEntryProps = {
  event: SharedRawBattleParsedEvent;
  attacker?: SharedWarrior;
  defender?: SharedWarrior;
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
