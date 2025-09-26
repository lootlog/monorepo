import { RawBattleParsedEvent } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { cn } from "@lootlog/ui/lib/utils";
import { FC } from "react";
import { Trans } from "react-i18next";
import { generateDynamicValuesAndComponents } from "./dynamic-values-helper";
import { processDamageValue, roundHpPercentage } from "./value-utils";

export type BattleLogAttackActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  defender?: Warrior;
  event: RawBattleParsedEvent;
};

export const BattleLogAttackActions: FC<BattleLogAttackActionsProps> = ({
  attacker,
  defender,
  actions,
  event,
}) => {
  return (
    actions.length > 0 && (
      <div
        className={cn("px-4 py-1 bg-gray-100/10 flex flex-col", {
          "bg-red-800/50": attacker?.team === 1,
          "bg-green-800/50": attacker?.team === 2,
        })}
      >
        {(() => {
          const positiveDamage = {
            dmgd: "",
            dmgf: "",
            dmgl: "",
            dmg: "",
            dmgo: "",
            dmgc: "",
            thirdatt: "",
          };
          const negativeDamage = {
            dmgd: "",
            dmgf: "",
            dmgl: "",
            dmg: "",
            dmgo: "",
            dmgc: "",
            thirdatt: "",
          };
          const otherActions: { type: string; value: string }[] = [];

          actions.forEach((action) => {
            if (action.type === "+dmgd")
              positiveDamage.dmgd = processDamageValue(action.value, "+");
            else if (action.type === "+dmgf")
              positiveDamage.dmgf = processDamageValue(action.value, "+");
            else if (action.type === "+dmgl")
              positiveDamage.dmgl = processDamageValue(action.value, "+");
            else if (action.type === "-dmgd")
              negativeDamage.dmgd = processDamageValue(action.value, "-");
            else if (action.type === "-dmgf")
              negativeDamage.dmgf = processDamageValue(action.value, "-");
            else if (action.type === "-dmgl")
              negativeDamage.dmgl = processDamageValue(action.value, "-");
            else if (action.type === "-dmg")
              negativeDamage.dmg = processDamageValue(action.value, "-");
            else if (action.type === "+dmg")
              positiveDamage.dmg = processDamageValue(action.value, "+");
            else if (action.type === "-dmgo")
              negativeDamage.dmgo = processDamageValue(action.value, "-");
            else if (action.type === "+dmgo")
              positiveDamage.dmgo = processDamageValue(action.value, "+");
            else if (action.type === "+dmgc")
              positiveDamage.dmgc = processDamageValue(action.value, "+");
            else if (action.type === "-dmgc")
              negativeDamage.dmgc = processDamageValue(action.value, "-");
            else if (action.type === "+thirdatt") {
              positiveDamage.thirdatt = processDamageValue(action.value, "+");
              otherActions.push(action);
            } else if (action.type === "-thirdatt") {
              negativeDamage.thirdatt = processDamageValue(action.value, "-");
            } else otherActions.push(action);
          });

          const hasPositiveDamage =
            positiveDamage.dmgd ||
            positiveDamage.dmgf ||
            positiveDamage.dmgl ||
            positiveDamage.dmg ||
            positiveDamage.dmgo ||
            positiveDamage.thirdatt ||
            positiveDamage.dmgc;
          const hasNegativeDamage =
            negativeDamage.dmgd ||
            negativeDamage.dmgf ||
            negativeDamage.dmgl ||
            negativeDamage.dmg ||
            negativeDamage.dmgo ||
            negativeDamage.thirdatt ||
            negativeDamage.dmgc;

          return (
            <>
              {hasPositiveDamage && (
                <span>
                  <Trans
                    i18nKey="battle.+combined_dmg"
                    values={{
                      name: attacker?.name,
                      hp: roundHpPercentage(event.attackerHpPercentage),
                      ...positiveDamage,
                    }}
                    components={{
                      value: <span className="font-semibold" />,
                      dmgd: <span className="font-semibold text-green-500" />,
                      dmgf: <span className="font-semibold text-red-500" />,
                      dmgl: <span className="font-semibold text-yellow-300" />,
                      dmg: <span className="font-semibold" />,
                      dmgo: <span className="font-semibold text-orange-400" />,
                      thirdatt: <span className="font-semibold" />,
                      dmgc: <span className="font-semibold text-blue-400" />,
                    }}
                  />
                </span>
              )}
              {otherActions.map((action, sIndex) => {
                const dynamicData = generateDynamicValuesAndComponents(
                  action.value,
                  "v",
                  <span className="font-semibold" />
                );
                return (
                  <span key={sIndex}>
                    <Trans
                      i18nKey={`battle.${action.type}`}
                      values={{
                        value: action.value,
                        ...dynamicData.values,
                      }}
                      components={{
                        value: <span className="font-semibold" />,
                        ...dynamicData.components,
                        ofwound: (
                          <span className="font-semibold text-orange-400" />
                        ),
                        thirdatt: (
                          <span className="font-semibold text-yellow-400" />
                        ),
                        heal: <span className="font-semibold text-blue-300" />,
                        fastArrow: (
                          <span className="font-semibold text-yellow-400" />
                        ),
                        crit: <span className="font-semibold text-red-400" />,
                        verycrit: (
                          <span className="font-semibold text-red-600" />
                        ),
                        bonusDamage: (
                          <span className="font-semibold text-purple-400" />
                        ),
                        resourceDestroy: (
                          <span className="font-semibold text-yellow-100" />
                        ),
                        curse: (
                          <span className="font-semibold text-yellow-400" />
                        ),
                        ofcrit: (
                          <span className="font-semibold text-orange-400" />
                        ),
                        legbonFacade: (
                          <span className="font-semibold text-sky-400" />
                        ),
                        legbonCritred: (
                          <span className="font-semibold text-sky-400" />
                        ),
                        pierce: (
                          <span className="font-semibold text-green-500" />
                        ),
                        injure: (
                          <span className="font-semibold text-pink-400" />
                        ),
                      }}
                    />
                  </span>
                );
              })}
              {hasNegativeDamage && (
                <span>
                  <Trans
                    i18nKey="battle.-combined_dmg"
                    values={{
                      name: defender?.name,
                      hp: roundHpPercentage(event.defenderHpPercentage),
                      ...negativeDamage,
                    }}
                    components={{
                      value: <span className="font-semibold" />,
                      dmgd: <span className="font-semibold text-green-500" />,
                      dmgf: <span className="font-semibold text-red-500" />,
                      dmgl: <span className="font-semibold text-yellow-300" />,
                      dmg: <span className="font-semibold" />,
                      dmgo: <span className="font-semibold text-orange-400" />,
                      thirdatt: <span className="font-semibold" />,
                      dmgc: <span className="font-semibold text-blue-400" />,
                    }}
                  />
                </span>
              )}
            </>
          );
        })()}
      </div>
    )
  );
};
