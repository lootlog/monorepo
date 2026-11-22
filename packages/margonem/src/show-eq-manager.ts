interface EquipmentPlayer {
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
