export const NORMAL_ATTACK = -1;

export const BATTLE_MASTERY_SLOTS = 20;

export type BattleMastery = {
  actions: readonly number[];
  repeat: boolean;
};

export const EMPTY_BATTLE_MASTERY: BattleMastery = {
  actions: [],
  repeat: false,
};

export const queueMasteryAction = (
  mastery: BattleMastery,
  action: number,
): BattleMastery =>
  mastery.actions.length >= BATTLE_MASTERY_SLOTS
    ? mastery
    : { ...mastery, actions: [...mastery.actions, action] };

export const removeMasteryAction = (
  mastery: BattleMastery,
  index: number,
): BattleMastery => ({
  ...mastery,
  actions: mastery.actions.filter((_, position) => position !== index),
});

export const moveMasteryAction = (
  mastery: BattleMastery,
  index: number,
  offset: -1 | 1,
): BattleMastery => {
  const target = index + offset;
  const moved = mastery.actions[index];
  const displaced = mastery.actions[target];

  if (moved === undefined || displaced === undefined) return mastery;

  const actions = [...mastery.actions];

  actions[index] = displaced;
  actions[target] = moved;

  return { ...mastery, actions };
};

const MASTERY_PART = /^mb(r?)((?:a|\d{1,5})(?:\.(?:a|\d{1,5})){0,19})?$/;

const ATTACK_CODE = "a";

export const encodeBattleMastery = ({ actions, repeat }: BattleMastery) =>
  actions.length === 0 && !repeat
    ? []
    : [
        `mb${repeat ? "r" : ""}${actions
          .map((action) => (action === NORMAL_ATTACK ? ATTACK_CODE : action))
          .join(".")}`,
      ];

export const decodeBattleMastery = (part: string): BattleMastery | null => {
  const match = MASTERY_PART.exec(part);

  if (!match) return null;

  return {
    repeat: match[1] === "r",
    actions: (match[2]?.split(".") ?? []).map((code) =>
      code === ATTACK_CODE ? NORMAL_ATTACK : Number(code),
    ),
  };
};
