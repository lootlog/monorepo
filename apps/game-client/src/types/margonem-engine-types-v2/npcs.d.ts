export interface NpcData {
  id: number;
  x: number;
  y: number;
  nick: string;
  lvl: number;
  type: number;
  wt: number;
  grp: number;
  icon: string;
  actions: number;
  [key: string]: any;
}

export interface Npc {
  d: NpcData;
  rx: number;
  ry: number;
  id: number;
  nick: string;
  lvl: number;
  type: number;
  wt: number;
  grp: number;
  icon: string;
  
  // Properties identified in Npc.js
  inMove: boolean;
  frame: number;
  frames: any;
  dlg: boolean;
  killTimer: any;
  dir: number;
  canvasObjectType: string;
  collider: any;
  isPlayer: boolean;
  overMouse: boolean;
  initOrder: boolean;
  order: number;
  onSelfMarginEmo: number;
  mapColSet: number[];
  frameAmount: number;
  sequence: number[];
  sequenceIndex: number;
  tutorialOrder: number;
  walkOver: boolean;
  eliteHereWasCall: boolean;
  qm: any[]; // Quest marks
  
  // Methods (partial list based on usage)
  init(): void;
  update(dt: number): void;
  draw(ctx: any): void;
  delete(): void;
  getFollowController(): any;
  createKillTimer(val: number): void;
  deleteNpcCollision(): void;
  addNpcCollision(): void;
  // ... inherited from Character
  [key: string]: any;
}

export interface NpcManager {
  init(): void;
  update(dt: number): void;
  draw(ctx: any): void;
  check(): any;
  checkNpc(id: number): boolean;
  getById(id: number): Npc;
  updateData(data: any): void;
  updateData_npcs_del(data: any): void;
  onClear(): void;
  getDrawableList(): Npc[];
  
  // Specific methods
  findKindNpc(obj: any): number;
  checkNpcPos(x: number, y: number): boolean;
  checkDeleteNpc(id: number): boolean;
  getDeleteNpc(id: number): any;
  isGateUrl(url: string): boolean;
  getSraj(id: number): any;
  getAllGroup(): any;
  getGroupColor(id: number): string;
  removeOne(id: number): void;
  groupShining(idGroup: number, show: boolean): void;
  getTip(obj: any, options: any): string;
  getTipDebugContent(npc: any): string;
  getAllEmoNameOfNpc(npc: any, actions?: any): string[];
  setNpcsAnimationState(state: boolean): void;
  getRenewableNpcByPosition(x: number, y: number): any;
  getByArrayId(arrayId: number[]): Npc[];
  isTalkNpc(npcId: number): boolean;
  manageDisplayOfNpcEmo(sourceId: number): void;
  clearAllCharacterBlur(): void;
  clearDataToDraw(): void;
  
  [key: string]: any;
}
