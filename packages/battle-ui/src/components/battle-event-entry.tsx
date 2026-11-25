import {
  BATTLE_MESSAGE_COLORS,
  BATTLE_MESSAGE_KIND_COLORS,
} from "../lib/battle-color-palette";
import { buildBattleEventMessage } from "../lib/battle-message";
import type { KeyboardEvent, FC, CSSProperties, Ref } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "../lib/battle-types";

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
  selected,
  searchMatched,
  activeSearchMatch,
  onSelect,
}) => {
  const { t } = useTranslation();

  const message = buildBattleEventMessage({
    event,
    attacker,
    defender,
    translate: t,
  });

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
        BATTLE_MESSAGE_KIND_COLORS[message.kind],
        onSelect && "cursor-pointer hover:bg-muted/40",
        searchMatched && "bg-amber-400/5",
        selected && "bg-primary/10",
        activeSearchMatch && "bg-amber-400/15",
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
        className="w-10 shrink-0 select-none px-1.5 pt-1 text-right font-mono text-2xs leading-none text-muted-foreground/70 tabular-nums"
      >
        #{turn}
      </span>

      <div className="min-w-0 flex-1 px-3 py-0.5">
        {message.lines.map((spans, lineIndex) => (
          // oxlint-disable-next-line react/no-array-index-key -- a message line has no identity beyond its position in the fixed log row
          <div key={lineIndex}>
            {spans.map((span, spanIndex) => (
              <span
                // oxlint-disable-next-line react/no-array-index-key -- a span has no identity beyond its position in the fixed line
                key={spanIndex}
                className={cn(
                  span.color && BATTLE_MESSAGE_COLORS[span.color],
                  span.bold && "font-bold",
                  span.italic && "italic",
                )}
              >
                {span.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </li>
  );
};
