export interface NightController {
  init(): void;
  getReady(): boolean;
  getFramesWithHoles(): any;
  update(dt: number): void;
  draw(ctx: any): void;
  updateData(v: any, additionalData?: any): void;
  onClear(): void;
  getNightOpacity(): number;
  getOrder(): number;
  getNight(): any[];
  rebuiltAfterSettingsSave(): void;
  createOneLightPoint(oneData: any, realXYPos?: any): any;
  getTime(): number;
  resizeMainCanvas(): void;
  setDynamicLight(dynamicLight: any): void;
  checkNight(): boolean;
  getActualFrame(): number;
  getNightFrameLength(): number;
  getCalculateStringNightColor(): string;
  getDayNightCycle(): boolean;
  getDayNightCycleOpacity(): number;
  rebulitInterval(): void;
  getRayData(): any;
  refreshFilter(): void;
  getAlwaysDraw(): boolean;
  setAlwaysDraw(alwaysDraw: boolean): void;
  [key: string]: any;
}

export interface DynamicLightsManager {
  init(): void;
  update(dt: number): void;
  updateData(rayData: any, additionalData?: any): void;
  getDynamicLightList(): any;
  onClear(): void;
  getframesWithHoles(): any;
  rajRemoveActionBeyondManager(id: any): void;
  refreshFilter(): void;
  [key: string]: any;
}

export interface OverrideDayNightCycle {
  // Inferred
  init(): void;
  isOverrideDayNightCycleExist(): boolean;
  geNormalizeOverrideDayNightCycleAlpha(minAlpha: number, objAlpha: number): number;
  getAlphaFactor(): number;
  [key: string]: any;
}

export interface DynamicDirCharacterLightsManager {
   // Inferred
   init(): void;
   getDirDynamicLightList(): any;
   [key: string]: any;
}

export interface BehaviorDynamicLightsManager {
   // Inferred
   init(): void;
   getBehaviorDynamicLightList(): any;
   [key: string]: any;
}
