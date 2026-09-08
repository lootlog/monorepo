/** ShowEqManager.ts falls back to the current world when world is absent. */
export interface EquipmentPlayer {
  id: number;
  account: number;
  nick: string;
  prof: string;
  lvl: number;
  icon: string;
  world?: string;
}

export type ShowEqManager = {
  update: (data: EquipmentPlayer) => void;
};
