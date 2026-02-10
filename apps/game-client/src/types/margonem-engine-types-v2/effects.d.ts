export interface FloatForegroundManager {
  init(): void;
  update(dt: number): void;
  onClear(): void;
  updateData(data: any): void;
  updateDataFloatForegroundFromRayController(v: any, additionalData?: any): void;
  getDrawableList(): any[];
  [key: string]: any;
}

export interface FloatObjectManager {
  init(): void;
  update(dt: number): void;
  onClear(): void;
  clearAndRemoveCallback(): void;
  updateDataFloatObjectFromRayController(v: any, additionalData?: any): void;
  getDrawableList(): any[];
  remove(id: any): void;
  getById(id: any): any;
  checkObjectExist(id: any): boolean;
  updateBehavior(data: any): void;
  refreshFilter(): void;
  [key: string]: any;
}

export interface ScreenEffectsManager {
  init(): void;
  onClear(): void;
  getDrawableList(): any[];
  update(dt: number): void;
  updateData(data: any, additionalData?: any): void;
  checkEffectExist(id: any): boolean;
  removeScreenEffect(id: any): void;
  resize(): void;
  [key: string]: any;
}

export interface MapBorderManager {
  init(): void;
  clearByKind(kind: string): void;
  getDrawableList(): any[];
  onClear(): void;
  updateData(data: any): void;
  checkMapBorderList(id: any): boolean;
  [key: string]: any;
}

export interface SpecificAnimationManager {
  // Inferred types as source file is missing
  init(): void;
  [key: string]: any;
}

export interface CharacterEffectsManager {
    // Inferred types as source file is missing
  [key: string]: any;
}
