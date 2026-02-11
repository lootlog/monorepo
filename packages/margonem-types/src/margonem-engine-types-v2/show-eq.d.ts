export interface ShowEqProps {
  id: number;
  account: number;
  nick: string;
  prof: string;
  lvl: number;
  icon: string;
  world: string;
}

export interface ShowEq {
  update(items: any): void;
  setItems(i: any): void;
  [key: string]: any;
}

export interface ShowEqManager {
  windows: {[key: string]: ShowEq};
  lastOpenWindow: number | null;
  
  update(playerData: ShowEqProps): void;
  getEqData(playerData: ShowEqProps): void;
  setItems(i: any): void;
  newWindow(playerData: ShowEqProps, items: any): void;
  removeWindow(playerId: number): void;
  getEngine(): any;
  
  [key: string]: any;
}
