export interface OtherData {
  id: number;
  nick: string;
  lvl: number;
  prof: string; // 'w', 'm', 'p', 'b', 'h', 't'
  icon: string;
  clan: {
    id: any;
    name: string;
    img: string;
  };
  x: number;
  y: number;
  // properties seen in OthersManager or common to characters
  attr: number; // bitmask
  relation: string; // 'fr', 'en', etc.
  
  [key: string]: any;
}

export interface Other {
  d: OtherData;
  id: number;
  nick: string;
  lvl: number;
  prof: string;
  icon: string; // url
  
  // Properties inferred from usage
  pet?: any;
  wanted?: any;
  colorMark?: any;
  
  // Methods
  init(): void;
  update(dt: number): void;
  draw(ctx: any): void;
  delete(animation?: boolean): void;
  updateDATA(data: any): void;
  firstAfterUpdate(): void;
  setStaticAnimation(state: boolean): void;
  tipUpdate(): void;
  
  // Inherited from Character (likely)
  rx: number;
  ry: number;
  isHide(): boolean;
  getCanvasObjectType(): string;
  drawIcon(ctx: any): void;
  
  [key: string]: any;
}

export interface OthersManager {
  init(): void;
  update(dt: number): void;
  draw(ctx: any): void;
  check(): {[key: number]: Other};
  getById(id: number): Other;
  updateData(data: any): void;
  onClear(animation?: boolean): void;
  getDrawableList(): Other[];
  
  // Specific methods
  setOthersAnimationState(state: boolean): void;
  otherTipRefresh(): void;
  removeOne(id: number, animation?: boolean): void;
  findKindOther(oneOther: any): number;
  getRoleplayRank(lvl: number): string;
  crushTestStart(max: number): void;
  oneObjTest(x: number, y: number, i?: number): any;
  createOtherContextMenu(e: any, player: any, exceptionsArray?: any[]): void;
  clearDataToDraw(): void;
  refreshFilter(): void;
  
  [key: string]: any;
}
