export interface ImgLoader {
  init(list?: any[]): void;
  preLoadImages(): void;
  add(url: string, gifReader: boolean, image: any): void;
  checkExist(url: string, gifReader: boolean | any): any; // Returns Image or null
  onload(path: string, gifReaderData: any, beforeOnloadCallback?: Function, afterOnloadCallback?: Function, onError?: Function, reload429?: boolean): void;
  getImgWithFilter(path: string, filter: string, gif?: boolean): any; // Canvas or Image
  clearFilters(): void;
  getEmptyImage(): any; // Image
  getYellowCanvas(): any; // Canvas
  cacheInitGraphic(url: string, gifReaderData: any): void;
  addToPreLoadSuccessLoadedList(url: string): void;
  deleteFromPreLoadSuccessLoadedList(url: string): void;
  checkFinishPreLoad(): boolean;
  manageUnlockImages(): void;
  
  [key: string]: any;
}
