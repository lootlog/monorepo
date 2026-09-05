import {
  groupBattleAttackDamage,
  getBattleActionValues,
} from "../utils/battle-action-values";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { cn } from "cn";
import type { FC } from "react";
import { Trans } from "react-i18next";
import { getBattleActionPresentation } from "../utils/battle-action-presentation";
import {
  BATTLE_SURFACE_COLORS,
  BATTLE_TEXT_COLORS,
} from "../utils/battle-color-palette";
import { generateDynamicValuesAndComponents } from "../utils/dynamic-values-helper";
import { roundHpPercentage } from "../utils/value-utils";

export type BattleLogAttackActionsProps = {
  actions: { type: string; value: string }[];
  attacker?: Warrior;
  defender?: Warrior;
  event: RawBattleParsedEvent;
  userTeam?: number;
};

const createStrongText = (className?: string) => (
  <span className={cn("font-semibold", className)} />
);

export const BattleLogAttackActions: FC<BattleLogAttackActionsProps> = ({
  attacker,
  defender,
  actions,
  event,
  userTeam,
}) => {
  return (
    actions.length > 0 && (
      <div
        className={cn(
          "flex flex-col px-3 py-0.5",
          BATTLE_SURFACE_COLORS.log.neutral,
          {
            [BATTLE_SURFACE_COLORS.log.enemy]: attacker?.team !== userTeam,
            [BATTLE_SURFACE_COLORS.log.friendly]: attacker?.team === userTeam,
          },
        )}
      >
        {(() => {
          const {
            positiveDamage,
            negativeDamage,
            otherActions,
            hasPositiveDamage,
            hasNegativeDamage,
          } = groupBattleAttackDamage(actions);

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
                      value: createStrongText(),
                      dmgd: createStrongText(
                        BATTLE_TEXT_COLORS.damage.distance,
                      ),
                      dmgf: createStrongText(BATTLE_TEXT_COLORS.damage.fire),
                      dmgl: createStrongText(
                        BATTLE_TEXT_COLORS.damage.lightning,
                      ),
                      dmg: createStrongText(),
                      dmgo: createStrongText(
                        BATTLE_TEXT_COLORS.damage.auxiliary,
                      ),
                      thirdatt: createStrongText(),
                      dmgc: createStrongText(BATTLE_TEXT_COLORS.damage.frost),
                    }}
                  />
                </span>
              )}
              {otherActions.map((action, sIndex) => {
                const dynamicData = generateDynamicValuesAndComponents(
                  action.value,
                  "v",
                  <span className="font-semibold" />,
                );
                const actionPresentation = getBattleActionPresentation(action);
                return (
                  <span key={sIndex}>
                    <Trans
                      i18nKey={actionPresentation.i18nKey}
                      values={getBattleActionValues(
                        action,
                        event,
                        attacker,
                        defender,
                        "attack",
                      )}
                      components={{
                        value: createStrongText(),
                        ...dynamicData.components,
                        ofwound: createStrongText(
                          BATTLE_TEXT_COLORS.damage.wound,
                        ),
                        thirdatt: createStrongText(
                          BATTLE_TEXT_COLORS.damage.thirdAttack,
                        ),
                        heal: createStrongText(BATTLE_TEXT_COLORS.healing.log),
                        fastArrow: createStrongText(
                          BATTLE_TEXT_COLORS.defense.destroy,
                        ),
                        frenzy: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.frenzy,
                        ),
                        crit: createStrongText(
                          BATTLE_TEXT_COLORS.damage.critical,
                        ),
                        verycrit: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.veryCrit,
                        ),
                        bonusDamage: createStrongText(
                          BATTLE_TEXT_COLORS.damage.bonus,
                        ),
                        resourceDestroy: createStrongText(
                          BATTLE_TEXT_COLORS.defense.resourceDestroy,
                        ),
                        curse: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.curse,
                        ),
                        ofcrit: createStrongText(
                          BATTLE_TEXT_COLORS.damage.criticalWound,
                        ),
                        cleanse: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.cleanse,
                        ),
                        legbonFacade: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.facade,
                        ),
                        legbonCritred: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.critShield,
                        ),
                        retaliation: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.retaliation,
                        ),
                        pierce: createStrongText(
                          BATTLE_TEXT_COLORS.defense.pierce,
                        ),
                        injure: createStrongText(
                          BATTLE_TEXT_COLORS.damage.injure,
                        ),
                        anguish: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.anguish,
                        ),
                        puncture: createStrongText(
                          BATTLE_TEXT_COLORS.legendary.puncture,
                        ),
                        crushDamage: createStrongText(
                          BATTLE_TEXT_COLORS.damage.crush,
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
                      value: createStrongText(),
                      dmgd: createStrongText(
                        BATTLE_TEXT_COLORS.damage.distance,
                      ),
                      dmgf: createStrongText(BATTLE_TEXT_COLORS.damage.fire),
                      dmgl: createStrongText(
                        BATTLE_TEXT_COLORS.damage.lightning,
                      ),
                      dmg: createStrongText(),
                      dmgo: createStrongText(
                        BATTLE_TEXT_COLORS.damage.auxiliary,
                      ),
                      dmga: createStrongText(),
                      thirdatt: createStrongText(),
                      dmgc: createStrongText(BATTLE_TEXT_COLORS.damage.frost),
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
