export interface CanvasCharacterWrapperManager {
  init(): void;
  draw(): void;
  getList(): any;
  update(dt: number): void;
  addCharacter(data: any): any;
  removeCharacter(id: any): void;
  [key: string]: any;
}

export interface HeroesRespManager {
  init(): void;
  getById(id: any): any;
  updateData(data: any): void;
  updateFullData(data: any): void;
  test(): any;
  onClear(): void;
  [key: string]: any;
}

export interface NpcIconManager {
  init(): void;
  updateData(data: any): void;
  checkNpcIcon(id: any): boolean;
  getNpcIcon(id: any): any;
  onClear(): void;
  [key: string]: any;
}

export interface NpcTplManager {
  init(): void;
  [key: string]: any;
}

export interface FakeNpcManager {
  init(): void;
  update(dt: number): void;
  draw(ctx: any): void;
  getDrawableList(): any[];
  serveRayControllerData(): void;
  removeFakeNpc(id: any): void;
  setFakeNpcAnimationState(): void;
  onClear(): void;
  getById(id: any): any;
  updateData(data: any, additionalData?: any): void;
  updateBehavior(data: any): void;
  checkFakeNpcListExist(id: any): boolean;
  refreshFilter(): void;
  [key: string]: any;
}
