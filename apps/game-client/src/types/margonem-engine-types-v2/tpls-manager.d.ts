import { Item } from './items';

export interface TplsManager {
  init(): void;
  createPlaceHolderItem(): void;
  initTs(): void;
  updateNoticeTop(): void;
  getNoticeTop(): number;
  getPlaceholderItem(): any;
  createViewIcon(itemId: number, viewName: string, tplLoc: string): any; // JQuery
  checkViewExist(viewName: string): void;
  changePlaceHolderIconIntoNormalIcon(itemId: number, loc: string): void;
  deleteViewIconIfExist(idItem: number, viewName: string, loc: string): void;
  deleteViewIcon(idItem: number, viewName: string, index?: number): void;
  deleteViewIconByTargetEl(idItem: number, viewName: string, $targetEl: any): void;
  removeAllViewInArrayByIdItemAndViewNameAndLoc(idItem: number, viewName: string, loc: string): void;
  deleteViewWithAllIcon(idItem: number, loc: string): void;
  removeIdItemViewsIfEmpty(idItem: number): void;
  addAndGetIdToFetchPackageController(d: any): number;
  getFetchPackageController(): any;
  decreaseFetchPackageController(idFetchPackage: number, loc: string): void;
  checkClearFetchPackageController(idFetchPackage: number): void;
  checkFetchFinish(idFetchPackage: number, loc: string): boolean;
  updateDATA(d: any): void;
  checkExist(i: number, obj: any): any; // Returns Tpl (Item)
  newTpl(i: number, d: any, idFetchPackage: number, getNow?: boolean): void;
  deleteTpl(loc: string, i: number): void;
  newTplInLocation(loc: string, tpl: Item, idFetchPackage: number): void;
  delayLocationCallbacks(tpl: Item, loc: string, i: string, finishFetch: boolean): void;
  fetchLocationTpls(loc: string): Item[];
  addCallback(loc: string, name: string, c: Function): void;
  removeCallback(data: any): void;
  fetch(data: any, f: Function): void;
  parseTplStat(s: string): any;
  changeItemAmount(item: Item, $item: any, serverAmount: number, options?: any): void;
  changeAmountInTip(item: Item, $item: any, newVal: number | string, options: any): void;
  onClear(): void;
  deleteMessItemsByLoc(loc: string): void;
  getTplByIdAndLoc(id: number, locTpl?: string): Item | null;
  getAllTpls(loc: string): {[key: number]: Item};
  test(): any;
  update(dt: number): void;
  drawItems(): void;
  getViewByIdAndLoc(id: number, viewNameGroup: string): any;
  getViewsByIdAndLoc(id: number, viewNameGroup: string): any;
  getAllViewsById(id: number): any[];
  getViewIndexByIdAndLocAndHtmlEl(id: number, loc: string, $targetEl: any): number;
  getViews(): any;
  getViewById(id: number): any;
  
  [key: string]: any;
}
