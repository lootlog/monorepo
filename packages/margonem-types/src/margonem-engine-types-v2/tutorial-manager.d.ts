export interface TutorialManager {
  init(): void;
  list: any;
  externalList: any;
  plData: any;
  enData: any;
  oneSend: boolean;
  idToStartAfterInterfaceLoad: any[];
  
  test(): void;
  literatGetAllHeadersName(): string;
  literatGetHeadersNameOfDoneTutorialStepByBits(literatBits: any): string;
  literatGetRaportAllHeadersName(): string;
  testAvailableTutorialId(testList: any): void;
  testHeader(testList: any): void;
  testText(testList: any): void;
  bitIsSet(bits: any, id: number): boolean;
  setBit(bits: any, id: number): any;
  getItemByClass(allItems: any, clObjectToClone: any, data: any): any;
  checkHasQuest(id: number): boolean;
  checkMinLevel(minLevel: number): boolean;
  checkMaxLevel(maxLevel: number): boolean;
  checkMap(idMaps: number[]): boolean;
  needItemsTest(dataFromList: any): boolean;
  getTutorialNeedItems(): any;
  checkUseItemIsRightWithTutorialItemsNeed(itemData: any): boolean;
  checkBlockHotKeys(clbName: string): boolean;
  checkBlockWidgets(clbName: string): boolean;
  checkFullFillFromList(id: number, data: any, externalData?: any): boolean;
  checkFullFillInterfaceRequire(id: number, data: any, externalData?: any): boolean;
  tutorialStart(lang: string, id: number, data: any, externalData?: any): void;
  startAfterInterfaceLoad(): void;
  startTutorialFromRayController(data: any): void;
  checkPreventRepeatExist(externalData: any): boolean;
  checkCanAddToExternalList(externalData: any): boolean;
  checkCanFinishExternalAndFinish(tutorialDataTrigger: any): void;
  
  [key: string]: any;
}
