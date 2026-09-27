import type { BattleWarriorsWithAccountId } from "@/store/game-store/battle.store";

/**
 * Margonem draws every warrior of a turn-based battle as its own element and
 * names it by class only (`other-id-battle-<id>`). Auto battles never insert
 * these elements, so they cannot be pinged.
 */
const WARRIOR_SELECTOR = ".battle-window .one-warrior";

const WARRIOR_ID_CLASS = /(?:^|\s)other-id-battle-(-?\d+)(?:\s|$)/;

export type BattleWarriorRole = "ally" | "enemy" | "self";

export type BattleWarrior = BattleWarriorsWithAccountId[string];

export const resolveBattleWarriorElement = (
  target: EventTarget | null,
): HTMLElement | null =>
  target instanceof Element
    ? target.closest<HTMLElement>(WARRIOR_SELECTOR)
    : null;

export const getBattleWarriorId = (element: Element): number | null => {
  const match = WARRIOR_ID_CLASS.exec(element.className);
  const id = match ? Number(match[1]) : Number.NaN;

  return Number.isSafeInteger(id) && id !== 0 ? id : null;
};

export const getBattleWarriorElement = (warriorId: number) =>
  document.querySelector<HTMLElement>(
    `${WARRIOR_SELECTOR}.other-id-battle-${warriorId}`,
  );

/** The warrior's sprite canvas, drawn by the game inside its element. */
const WARRIOR_SPRITE_SELECTOR = ":scope > .canvas-warrior-icon";

/**
 * Outlines a warrior's sprite in a ping's colour, like the map glow, and
 * returns the undo. The game never sets a filter on the sprite.
 */
export const glowBattleWarrior = (element: HTMLElement, color: string) => {
  const sprite = element.querySelector<HTMLElement>(WARRIOR_SPRITE_SELECTOR);

  if (!sprite) return () => undefined;

  sprite.style.filter = `drop-shadow(0 0 1px ${color}) drop-shadow(0 0 4px ${color})`;

  return () => {
    sprite.style.filter = "";
  };
};

export const getBattleWarrior = (
  warriors: BattleWarriorsWithAccountId,
  warriorId: number,
): BattleWarrior | undefined => warriors[String(warriorId)];

export const getBattleWarriorRole = (
  warriors: BattleWarriorsWithAccountId,
  heroCharacterId: string,
  warriorId: number,
): BattleWarriorRole | null => {
  const hero = warriors[heroCharacterId];
  const warrior = getBattleWarrior(warriors, warriorId);

  if (!hero || !warrior) {
    return null;
  }

  if (String(warriorId) === heroCharacterId) {
    return "self";
  }

  return warrior.team === hero.team ? "ally" : "enemy";
};

/** Other characters (not NPCs) fighting on the hero's team. */
export const getBattleTeamCharacterIds = (
  warriors: BattleWarriorsWithAccountId,
  heroCharacterId: string,
): string[] => {
  const hero = warriors[heroCharacterId];

  if (!hero) {
    return [];
  }

  return Object.values(warriors)
    .filter(
      (warrior) =>
        warrior.id > 0 &&
        warrior.team === hero.team &&
        String(warrior.id) !== heroCharacterId,
    )
    .map((warrior) => String(warrior.id));
};
