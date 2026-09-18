import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";
import { BattleActionList } from "./actions/battle-action-list";
import { BattleLogAttackActions } from "./actions/battle-log-attack-action";
import type { KeyboardEvent, FC, CSSProperties, Ref } from "react";
import { parseActions } from "./utils/battle-actions-parser";
import { BattlePassiveActions } from "./actions/battle-passive-actions";
import { BattleSpellActions } from "./actions/battle-spell-actions";
import { cn } from "cn";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

export type BattleEventEntryProps = {
  rowRef?: Ref<HTMLLIElement>;
  style?: CSSProperties;
  onFocus?: () => void;
  onBlur?: () => void;
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
  rowRef,
  style,
  onFocus,
  onBlur,
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

      return;
    }

    if (keyboardEvent.key !== "ArrowDown" && keyboardEvent.key !== "ArrowUp") {
      return;
    }

    // Rows are siblings in turn order, so the arrows walk the log without tabbing through it.
    const adjacentRow =
      keyboardEvent.key === "ArrowDown"
        ? keyboardEvent.currentTarget.nextElementSibling
        : keyboardEvent.currentTarget.previousElementSibling;

    if (adjacentRow instanceof HTMLElement) {
      keyboardEvent.preventDefault();
      adjacentRow.focus();
    }
  };

  return (
    <li
      ref={rowRef}
      style={style}
      data-index={eventIndex}
      onFocus={onFocus}
      onBlur={onBlur}
      className={cn(
        "flex border-b border-background outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        onSelect && "cursor-pointer hover:bg-muted/40",
        searchMatched && "bg-amber-400/5",
        selected && "bg-primary/10 shadow-[inset_2px_0_0_0_var(--primary)]",
        activeSearchMatch &&
          "bg-amber-400/15 shadow-[inset_2px_0_0_0_var(--color-amber-400)]",
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
        className="w-10 shrink-0 select-none px-1.5 pt-1 text-right font-mono text-[10px] leading-none text-muted-foreground/70 tabular-nums"
      >
        #{turn}
      </span>

      <div className="min-w-0 flex-1">
        <BattleActionList
          valueClassName={cn("font-bold", BATTLE_TEXT_COLORS.damage.auxiliary)}
          actions={parsedActions.buffActions}
          attacker={attacker}
          event={event}
          eventIndex={eventIndex}
        />

        <BattleActionList
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

        <BattleActionList
          actions={parsedActions.outcomeActions}
          attacker={attacker}
          event={event}
          eventIndex={eventIndex}
        />
      </div>
    </li>
  );
};
