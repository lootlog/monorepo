import { BattleLogAttackActions } from "./actions/battle-log-attack-action";
import type { KeyboardEvent, FC } from "react";
import { parseActions } from "./utils/battle-actions-parser";
import { BattleBuffActions } from "./actions/battle-buff-actions";
import { BattleOutcomeActions } from "./actions/battle-outcome-actions";
import { BattlePassiveActions } from "./actions/battle-passive-actions";
import { BattleSpellActions } from "./actions/battle-spell-actions";
import { BattleSystemActions } from "./actions/battle-system-actions";
import { cn } from "@lootlog/ui/lib/utils";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

export type BattleEventEntryProps = {
  event: RawBattleParsedEvent;
  attacker?: Warrior;
  defender?: Warrior;
  eventIndex: number;
  turn: number;
  userTeam?: number;
  selected?: boolean;
  searchMatched?: boolean;
  activeSearchMatch?: boolean;
  onSelect?: () => void;
};

export const BattleEventEntry: FC<BattleEventEntryProps> = ({
  event,
  attacker,
  defender,
  eventIndex,
  turn,
  userTeam,
  selected,
  searchMatched,
  activeSearchMatch,
  onSelect,
}) => {
  const parsedActions = parseActions(event.actions);

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLLIElement>) => {
    if (!onSelect) {
      return;
    }

    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      onSelect();
    }
  };

  return (
    <li
      className={cn(
        "relative border-b border-transparent pr-11 outline-none transition-colors",
        onSelect && "cursor-pointer hover:bg-muted/40",
        searchMatched && "bg-amber-400/5",
        selected && "border-l-2 border-l-primary bg-primary/5",
        activeSearchMatch && "border-l-2 border-l-amber-400 bg-amber-400/10",
      )}
      role={onSelect ? "button" : undefined}
      data-battle-turn={turn}
      data-battle-search-match={searchMatched ? "true" : undefined}
      data-battle-search-active={activeSearchMatch ? "true" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1.5 rounded-sm border border-border/40 bg-background/45 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground/60 tabular-nums"
      >
        #{turn}
      </span>

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
