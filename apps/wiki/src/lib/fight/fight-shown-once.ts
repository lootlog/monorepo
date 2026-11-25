import type { FighterState } from "./fight-state";

export const showOnce = (
  attacker: FighterState,
  defender: FighterState,
  {
    facade,
    armorDestroyed,
    absorbShareDestroyed,
  }: {
    facade: number;
    armorDestroyed: boolean;
    absorbShareDestroyed: { absorb: number; absorbMagic: number };
  },
) => {
  const armorProtected =
    armorDestroyed && !defender.armorProtectionShownTo.has(attacker.index);

  const absorbProtected =
    absorbShareDestroyed.absorb + absorbShareDestroyed.absorbMagic > 0 &&
    !defender.absorbProtectionShown &&
    defender.combatant.absorbDestructionReduction > 0;

  const shown = {
    puncture: attacker.punctureShown
      ? 0
      : attacker.combatant.legendary.puncture,
    facade: defender.facadeShown ? 0 : facade,
    armorDestructionReduction: armorProtected
      ? defender.combatant.armorDestructionReduction
      : 0,
    absorbDestructionReduction: absorbProtected
      ? defender.combatant.absorbDestructionReduction
      : 0,
  };

  attacker.punctureShown = true;

  if (facade > 0) defender.facadeShown = true;

  if (armorProtected) defender.armorProtectionShownTo.add(attacker.index);

  if (absorbProtected) defender.absorbProtectionShown = true;

  return shown;
};
