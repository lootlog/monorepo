import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { FC, memo } from "react";
import { BattleActionItem } from "./battle-action-item";

export type BattleSpellActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  defender?: Warrior;
  event: RawBattleParsedEvent;
  eventIndex: number;
};

export const BattleSpellActions: FC<BattleSpellActionsProps> = memo(({
  actions,
  attacker,
  defender,
  event,
  eventIndex,
}) => {
  if (actions.length === 0) return null;

  const transformValue = (value: string, type: string): string => {
    if (type === "energy" || type === "mana") {
      return (parseInt(value, 10) * -1).toString();
    }
    return value;
  };

  return (
    <>
      {actions.map((action, sIndex) => (
        <BattleActionItem
          key={`spellActions-${eventIndex}-${sIndex}`}
          action={action}
          attacker={attacker}
          defender={defender}
          event={event}
          transformValue={transformValue}
          customComponents={{
            value: <span className="font-semibold" />,
          }}
        />
      ))}
    </>
  );
});

BattleSpellActions.displayName = "BattleSpellActions";