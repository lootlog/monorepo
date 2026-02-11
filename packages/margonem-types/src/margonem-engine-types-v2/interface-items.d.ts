export interface InterfaceItems {
  init(): void;
  getDisableSlotsList(): any;
  getFreeSlots(): any;
  setDisableSlots(kind: string): void;
  setEnableSlots(kind: string): void;
  newBottomItem(data: any, $slot: any, slotIsFull?: boolean, $dropItemParent?: any): void;
  newBottomItemFromFetch(data: any): void;
  changePlaceTwoItems(idDropItem: number, $newSlot: any, $dropItemParent: any): void;
  afterDrop($slot: any, data: any): void;
  fromStorage(sData: any, data: any): void;
  initBottomItem(data: any, float: string, index: number): any;
  isntRightItem(data: any, alert: boolean): boolean;
  setPosItem($item: any, float: string, index: number): void;
  prepareMenuToPutItemInSlot(item: any, e: any): void;
  bItemCallbacks(data: any): void;
  afterUpdateCallback(oldState: any): void;
  deleteCallback(): void;
  deleteAllCallback(item: any): void;
  changeOnNewItem(data: any): void;
  deleteExistItem(id: number, data: any): void;
  isActiveDroppableWindow(): boolean;
  doInterfaceItemAcion(key: number): void;
  afterUse(data: any): void;
  afterUseCallback($div: any): void;
  
  [key: string]: any;
}
