export interface HeroEquipment {
  init(): void;
  initBeforeUpdateItems(): void;
  initAfterUpdateItems(): void;
  getHItems(): any;
  getEqItems(): any;
  countItemsByName(name: string): number;
  newInventoryItems(i: any, finish?: boolean): void;
  bagManage(oldI: any, newI: any): void;
  addToBag(i: any): void;
  removeFromBag(i: any): void;
  itemChangeBag(oldI: any, newI: any): boolean;
  updateBagAmount(): void;
  getFreeSlots(): number;
  addHighlightNewItem(i: any, $icon: any, old?: any): void;
  updateAmountOnWidget(): void;
  eqItemsTable(i: any): void;
  checkItemCanEquip(i: any): boolean;
  changeLocation(i: any, $icon: any): void;
  checkBlessEquipped(i: any): boolean;
  dropBless(itemId: number): void;
  removeBless(i: any): void;
  checkAbbyssItem(i: any): boolean;
  decreaseAbbyssItemAmount(i: any): void;
  increaseAbbyssItemAmount(i: any): void;
  checkChampionsItem(i: any): boolean;
  decreaseChampionsItemAmount(i: any): void;
  increaseChampionsItemAmount(i: any): void;
  rebuiltBagsState(i: any): void;
  canDraggableFix(): boolean;
  getTs(): number;
  saveOldXAndY(x: number, y: number): void;
  getCountAbbyssCurrency(): number;
  getCountChempionsCurrency(): number;
  setItemsInHeroEquipmentWasChange(state: boolean): void;
  
  [key: string]: any;
}
