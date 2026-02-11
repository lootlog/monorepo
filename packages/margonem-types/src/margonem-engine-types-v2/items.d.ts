export interface ItemData {
  id: number;
  hid: number;
  x: number;
  y: number;
  loc: string;
  tpl: number;
  st: number;
  cl: number;
  name: string;
  icon: string;
  stat: string;
  [key: string]: any;
}

export interface Item {
  id: number;
  d: ItemData;
  loc: string;
  st: number;
  cl: number;
  tpl: number;
  name: string;
  icon: string;
  stat: string; // from d.stat or parsed
  
  // Properties identified in Item.js
  kind?: string;
  x?: number;
  y?: number;
  rx?: number;
  ry?: number;
  events: any;
  _cachedStats: any;
  onload: boolean;
  itemType: string;
  hlPos: any;
  score: any;
  ctx: any;
  $canvasIcon: any; // JQuery
  fw: number;
  fh: number;
  activeFrame: number;
  
  // Methods
  update(d: any, idFetchPackage?: number): void;
  updateIcon(): void;
  updateDraw(dt: number): void;
  drawItem(ctx: any, canvas: any, kind: any, shouldDrawNotice: boolean, noticeCanvas: any, noticeCtx: any): void;
  drawIcon(ctx: any, canvas: any): void;
  drawNotice(ctx: any, canvas: any): void;
  animate(dt: number): void;
  setPlaceHolderIcon(): void;
  afterOnloadItem(f: any, i: any): void;
  continueFetch(): void;
  fetchError(): void;
  getTpl(): number;
  isItem(): boolean;
  updateDynamicTips($view: any, timeout: number): void;
  updateTtl(): void;
  updateAmount(): void;
  updadeViewAfterUpdateItem($viewIcon: any): void;
  getUnbindCost(): number;
  checkGetNow(d: any): void;
  getOutfits(): any;
  createOptionMenu(e: any, callbackData: any, block?: any, options?: any): void;
  
  [key: string]: any;
}

export interface ItemsManager {
  init(): void;
  createPlaceHolderItem(): void;
  initTs(): void;
  updateNoticeTop(): void;
  getNoticeTop(): number;
  getPlaceholderItem(): any;
  createViewIcon(itemId: number, viewName?: string): any; // JQuery
  checkViewExist(viewName: string): void;
  changePlaceHolderIconIntoNormalIcon(itemId: number): void;
  deleteViewIconIfExist(idItem: number, viewName: string): void;
  deleteViewIcon(idItem: number, viewName: string): void;
  deleteViewWithAllIcon(idItem: number): void;
  addAndGetIdToFetchPackageController(d: any): number;
  getFetchPackageController(): any;
  decreaseFetchPackageController(idFetchPackage: number, loc: string): void;
  checkClearFetchPackageController(idFetchPackage: number): void;
  checkFetchFinish(idFetchPackage: number, loc: string): boolean;
  getLocToUpdate(d: any): any;
  updateDATA(d: any): void;
  addToBeforeUpdateItemsCallback(data: any, f: Function): void;
  addToAfterUpdateItemsCallback(data: any, f: Function): void;
  beforeUpdate(d: any, locToUpdate: any): void;
  afterUpdate(d: any, locToUpdate: any): void;
  updateItem(i: number, d: any, idFetchPackage: number): void;
  checkGetNow(i: number, d: any): void;
  newItem(i: number, d: any, idFetchPackage: number, getNow?: boolean): void;
  deleteItem(i: number, beforeDelete?: boolean): void;
  newItemInLocation(loc: string, item: any, idFetchPackage: number): void;
  delayLocationCallbacks(item: Item, loc: string, i: string, finishFetch: boolean): void;
  fetchLocationItems(loc: string): Item[];
  addCallback(loc: string, name: string, c: Function): void;
  removeCallback(data: any): void;
  fetch(data: any, f: Function): void;
  parseItemStat(s: string): any;
  deleteUnnecessaryItems(): void;
  getItemById(id: number): Item;
  onClear(): void;
  test(): any;
  testMyItems(): any;
  update(dt: number): void;
  getViews(): any;
  getViewById(id: number): any;
  getViewByIdAndLoc(id: number, viewNameGroup: string): any;
  getAllViewsById(id: number): any[];
  getAllViewsByViewName(viewName: string): any[];
  deleteAllViewsByViewName(viewName: string): void;
  getAllViewsByIdAndViewName(id: number, viewName: string): any[];
  getAllViewsItemsById(id: number): any;
  drawItems(): void;
  deleteMessItemsByLoc(loc: string, beforeDelete?: boolean): void;
  deleteMessItemsByLocAndOwnId(loc: string, ownId: number, beforeDelete?: boolean): void;
  
  [key: string]: any;
}
