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
};

/**
 * Renders a single battle event with all its categorized actions
 *
 * This component orchestrates the rendering of different action types
 * from a parsed battle event, delegating to specialized action components.
 *
 * @param event - Raw battle event data
 * @param attacker - Warrior who performed the action
 * @param defender - Warrior who received the action
 * @param eventIndex - Index for React keys
 */
export const BattleEventEntry: FC<BattleEventEntryProps> = memo(({
  event,
  attacker,
  defender,
  eventIndex,
}) => {
  // Parse actions with memoization to avoid re-parsing on every render
  const parsedActions = useMemo(
    () => parseActions(event.actions),
    [event.actions]
  );

  return (
    <li className="border-b-2">
      {/* Buff actions - status effects that help allies */}
      <BattleBuffActions
        actions={parsedActions.buffActions}
        attacker={attacker}
        event={event}
        eventIndex={eventIndex}
      />

      {/* System actions - game messages and notifications */}
      <BattleSystemActions
        actions={parsedActions.systemActions}
        attacker={attacker}
        event={event}
        eventIndex={eventIndex}
      />

      {/* Spell actions - magic spells and abilities */}
      <BattleSpellActions
        actions={parsedActions.spellActions}
        attacker={attacker}
        defender={defender}
        event={event}
        eventIndex={eventIndex}
      />

      {/* Attack actions - damage dealing and combat effects */}
      <BattleLogAttackActions
        attacker={attacker}
        defender={defender}
        actions={parsedActions.attackActions}
        event={event}
      />

      {/* Passive actions - ongoing effects like healing, poison */}
      <BattlePassiveActions
        actions={parsedActions.passiveActions}
        attacker={attacker}
        event={event}
        eventIndex={eventIndex}
      />

      {/* Outcome actions - battle results (winner/loser) */}
      <BattleOutcomeActions
        actions={parsedActions.outcomeActions}
        attacker={attacker}
        event={event}
        eventIndex={eventIndex}
      />
    </li>
  );
});

BattleEventEntry.displayName = "BattleEventEntry";