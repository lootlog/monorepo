export interface WindowManager {
  init(): void;
  initLayersAttachList(): void;
  addToAttachLayer(wnd: any): void;
  removeElementFromWidgetLinked(wnd: any): void;
  removeFromAttachLayer(wnd: any): void;
  checkOptIsCorrect(opt: any): boolean;
  manageRegisteredWindow(name: string): void;
  checkWindowIsShowByLinkedWidget(widgetName: string): boolean;
  checkWindowIsShow(name: string): boolean;
  checkWidgetIsLinkedToWindow(widgetName: string): boolean;
  getWndByLinkedWidgetName(widgetName: string): any;
  addElementToWidgetLinkedWithWindow(nameWindow: string, idWindow: number, widgetName: string): void;
  add(opt: any): any;
  remove(name: string, id: number): void;
  addIdToWindow(wnd: any, id: number): void;
  addParentToWindow(wnd: any, parentOfWindow: any): void;
  addNameRefInParentWindow(wnd: any, nameRefInParent: string): void;
  checkNameWindowExistInList(name: string): boolean;
  createNameObjectInList(name: string): void;
  addToList(name: string, id: number, wnd: any): void;
  getNewIdToWindow(name: string): number;
  removeFromList(wnd: any): void;
  getWndByNameAndId(name: string, id: number): any;
  getList(): any;
  updatePosOfWindowsInSpecificLayer(layerName: string): void;
  getLayersAttachList(): any;
  [key: string]: any;
}

export interface WindowsData {
  name: {
    [key: string]: string;
  };
  windowCloseConfig: {
    [key: string]: string;
  };
  type: {
    TRANSPARENT: string;
    [key: string]: string;
  };
  position: {
    CENTER: string;
    CENTER_OR_STICK_TO_EQ: string;
    CENTER_OR_SAVE_IN_STORAGE: string;
    RIGHT_POSITIONING: string;
    TOP_POSITIONING: string;
    NOT_UPDATE: string;
    [key: string]: string;
  };
  [key: string]: any;
}

export interface IframeWindowManager {
  init(): void;
  check(url: string): boolean;
  add(url: string, contentClass: string, wndData: any, closeCallback?: any): void;
  close(url: string): void;
  remove(url: string): void;
  newPlayerProfile(opts: any): void;
  newClanPage(opts: any): void;
  integrationPage(opts: any): void;
  list: { [url: string]: any };
  [key: string]: any;
}
