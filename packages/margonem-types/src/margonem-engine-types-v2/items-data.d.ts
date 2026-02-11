export interface FetchData {
  [key: string]: { loc: string | boolean };
}

export interface ApiData {
  NEW_MSG: string;
  UPDATE_MSG: string;
  HERO_UPDATE: string;
  NEW_ASK: string;
  // ... add other keys from ApiData.js
  [key: string]: string;
}

export interface DisableData {
  MAIL: string;
  SHOP: string;
  BARTER: string;
  DEPO: string;
  // ... add other keys from DisableData.js
  [key: string]: string;
}

export interface ItemStatsData {
  [key: string]: string;
}


export interface MovedData {
  // Inferred
  [key: string]: any;
}

export interface ViewData {
  // Inferred
  BAG_VIEW: string;
  [key: string]: any;
}

export interface DisableItemsManager {
  init(): void;
  addToActiveDisableKinds(disableKind: string): void;
  removeFromActiveDisableKinds(disableKind: string): void;
  checkRequires(item: any, activeDisableKinds: any): boolean;
  manageItemDisable(item: any, $itemView: any, activeDisableKinds: any): void;
  startSpecificItemKindDisable(disableKind: string, options?: any): void;
  endSpecificItemKindDisable(disableKind: string): void;
  getEnabledItems(): number[];
  [key: string]: any;
}

export interface ItemsMovedManager {
  init(): void;
  addItem(item: any, loc: any, clb: any): void;
  removeItem(itemId: any): void;
  removeItemsByTarget(loc: any, excludes?: any[]): void;
  [key: string]: any;
}

export interface ItemStats {
  setAllItemStats(allItemStats: any): void;
  getStat(statName: string): any;
  issetStat(statName: string): boolean;
  getStatsDebugStr(): string;
  [key: string]: any;
}
