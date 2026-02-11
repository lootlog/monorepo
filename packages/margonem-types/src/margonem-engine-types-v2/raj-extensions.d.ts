export interface RajSequenceManager {
  init(): void;
  getSequenceList(): any;
  updateData(data: any, additionalData?: any): void;
  createAction(oneSequenceData: any, additionalData?: any): void;
  removeAction(oneSequenceData: any, additionalData?: any): void;
  rajRemoveActionBeyondManager(id: any, additionalData?: any): void;
  onClear(): void;
  update(dt: number): void;
  [key: string]: any;
}

export interface RajPreloadImage {
  init(): void;
  updateData(v: any): void;
  [key: string]: any;
}

export interface RajAreaTriggerManager {
  init(): void;
  updateData(srajData: any, additionalData?: any): void;
  onClear(): void;
  [key: string]: any;
}

export interface RajHtmlCssModifierManager {
  init(): void;
  updateDataFromRayController(v: any, additionalData?: any): void;
  getRajActionManager(): any;
  onClear(): void;
  clearAndRemoveCallback(): void;
  [key: string]: any;
}

export interface RajCamera {
  init(): void;
  update(dt: number): void;
  updateData(data: any, additionalData?: any): void;
  onClear(): void;
  [key: string]: any;
}

export interface RajYellowMessage {
  init(): void;
  updateData(data: any): void;
  [key: string]: any;
}

export interface RajEmoActions {
  init(): void;
  updateData(emoActionsData: any, additionalData?: any): void;
  checkOneNpcActionsList(npcId: any): boolean;
  getShowNotify(npcId: any, emoName: any): boolean;
  deleteOneNpcActionsList(npcId: any): void;
  onClear(): void;
  getRajEmoDefinitionsActionsFileNamesArrayToAddToTip(npcId: any): any[];
  getClToAddToTip(npcId: any): any[];
  [key: string]: any;
}

export interface RajDialogue {
  init(): void;
  getDialogName(): any;
  onClear(): void;
  updateData(data: any, additionalData?: any): void;
  [key: string]: any;
}

export interface RajSound {
  init(): void;
  checkSource(): boolean;
  getVolumeForSourceSound(x: number, y: number): number;
  getSpecificVolume(): number;
  finishSound(): void;
  getId(): any;
  update(dt: number): void;
  updateData(data: any): void;
  [key: string]: any;
}

export interface RajSoundManager {
 // Inferred
  init(): void;
  createSrajSound(url: string, rajSound: RajSound): void;
  removeRajSound(id: any): void;
  prepareSrajSound(url: string): void;
  [key: string]: any;
}

export interface RajMapMusicManager {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface RajRandomCallerManager {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface RajExtraLight {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface RajTracking {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface RajZoomManager {
  init(): void;
  updateData(v: any, additionalData?: any): void;
  onClear(): void;
  [key: string]: any;
}

export interface RajCanvasFilter {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface RajCharacterHide {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface RajMassObjectHide {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface RajEmoDefinitions {
  // Inferred
  init(): void;
  getFilename(emoName: string): string;
  [key: string]: any;
}

export interface RajProgrammer {
  // Inferred
  init(): void;
  [key: string]: any;
}
