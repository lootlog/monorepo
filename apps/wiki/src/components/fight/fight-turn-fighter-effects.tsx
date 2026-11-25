import { cn } from "cn";
import { t } from "@/i18n/messages";
import type { FighterSnapshot } from "@/lib/fight/fight-snapshot";
import {
  buffLabel,
  conditionLabel,
  turnsLeftText,
} from "@/lib/fight/fight-turn-labels";

type EffectLine = {
  id: string;
  label: string;
  turns: number | null;
  source: number | null;
};

const effectLines = (fighter: FighterSnapshot): EffectLine[] => [
  ...fighter.conditions.map((condition, index) => ({
    id: `condition-${condition.id}-${index}`,
    label: conditionLabel(condition),
    turns: condition.turns,
    source: condition.source,
  })),
  ...fighter.buffs.map((buff, index) => ({
    id: `buff-${buff.key}-${index}`,
    label: buffLabel(buff),
    turns: buff.turns,
    source: buff.source,
  })),
];

export function FightTurnFighterEffects({
  index,
  fighter,
  nameOf,
  nameClass,
}: {
  index: number;
  fighter: FighterSnapshot;
  nameOf: (index: number) => string;
  nameClass: string;
}) {
  const effects = effectLines(fighter);

  return (
    <div className="flex flex-col gap-2 text-[0.8125rem]">
      <h4 className={cn("text-xs font-semibold", nameClass)}>
        {nameOf(index)}
      </h4>
      {effects.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {effects.map((effect) => (
            <li key={effect.id} className="flex flex-col">
              <span>{effect.label}</span>
              <span className="text-xs text-muted-foreground">
                {[
                  turnsLeftText(effect.turns),
                  ...(effect.source === null || effect.source === index
                    ? []
                    : [
                        t("fightPage.turn.fromSource", {
                          source: nameOf(effect.source),
                        }),
                      ]),
                ].join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("fightPage.turn.noEffects")}
        </p>
      )}
      <h5 className="pt-1 text-xs text-muted-foreground">
        {t("fightPage.turn.cooldownsTitle")}
      </h5>
      {fighter.cooldowns.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {fighter.cooldowns.map((cooldown) => (
            <li key={cooldown.name} className="flex gap-2">
              <span>{cooldown.name}</span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {turnsLeftText(cooldown.turns)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("fightPage.turn.noCooldowns")}
        </p>
      )}
    </div>
  );
}
