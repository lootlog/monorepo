export interface HeroData {
  id: number;
  x: number;
  y: number;
  dir: number;
  nick: string;
  lvl: number;
  prof: string;
  icon: string;
  gender: string;
  clan?: {
    name: string;
    id: any;
  };
  is_blessed?: boolean;
  attr?: number; // bitmask
  vip?: number | string;
  wanted?: number | boolean;
  matchmaking_champion?: boolean;
  ttl?: number;
  uprawnienia?: number; // permissions bitmask
  guest?: number | boolean;
  warrior_stats?: {
    hp: number;
    maxhp?: number;
    [key: string]: any;
  };
  stasis?: number | boolean;
  stasis_incoming_seconds?: number;
  
  [key: string]: any;
}

export interface Hero {
  d: HeroData;
  rx: number;
  ry: number;
  id: number;
  nick: string;
  lvl: number;
  prof: string;
  digits: string;
  
  isPlayer: boolean;
  autoPath: any; // SearchPath.getEmptyRoad()
  roadDisplay: any; // RoadDisplay
  markOtherObj: boolean;
  autoWalkLock: boolean;
  canvasObjectType: string;
  overMouse: boolean;
  damageSum: string;
  stop: boolean;
  onSelfMarginEmo: number;
  goldLimit: boolean;
  st: any; // stats
  tutorialOrder: number;
  waitForDialog: boolean;
  teleportLessThan5: boolean;
  previewOutfit: boolean;
  outfitData: {
    original: any;
    preview: any;
  };
  
  // Methods
  init(): void;
  update(dt: number): void;
  move(dt: number): void;
  run(l: number): void;
  autoGoTo(to: {x: number, y: number}, clickInMapCanvas?: boolean): void;
  searchPath(to: {x: number, y: number}): void;
  getHeroNode(): any; // SearchPath.map.getNode
  dirMapping(): number[];
  resetIdleTime(): void;
  setIdleTime(time: number): void;
  incrementIdleTimeByTd(dt: number): void;
  getIdleTime(): number;
  checkCanCallCenterMapOnHero(): boolean;
  callCheckCanFinishExternalTutorialMove(): void;
  callCheckCanFinishExternalTutorialTalkNpc(npcId: number | string): void;
  callCheckCanFinishExternalTutorialAttackNpc(npcId: number | string): void;
  getAutoGw(): any;
  isMan(): boolean;
  setCorrectDir(dirMapping: number[]): boolean;
  checkNextTileFromDirection(dir: number): boolean;
  nextStep(x: number, y: number): void;
  animate(dt: number): void;
  clearAnimationAndGw(): void;
  getDirectionFromNextPos(pos: {x: number, y: number}): number;
  getRefFollowObj(): any;
  clearRefFollowObj(): void;
  doActionAfterFinishRoadOfSearchPath(): void;
  addAfterFollowAction(object: any, action: () => void): void;
  clearAfterFollowAction(): void;
  setInputParser(): void;
  calculateNextStep(rest?: number): boolean;
  afterUpdate(data: any, old: any, allData: any): void;
  
  getStartClickOnMapMove(): boolean;
  updateTip(): void;
  removeBless(): void;
  createStrTip(): string;
  setTipHeader(o?: any): string;
  updateWhoIsHereGlow(): void;
  setBuffsSections(): string;
  updateGainedExp(d: any): void;
  showGainedExp(val: number, lvl: number): void;
  showDifference($wrapper: any, newValue: any, oldValue: any): void;
  clearAutoPathOfHero(): void;
  
  // Character method overrides/inherited
   changeWarShadowOpacity(dt: number): void;
   decreaseWarShadowOpacity(dt: number): void;
   isHide(): boolean;
   getCanvasObjectType(): string;
   setWarShadowAlpha(ctx: any): void;
   setDefaultAlpha(ctx: any): void;
   draw(ctx: any): void;
   getCharacterLeft(): number;
   getCharacterTop(): number;
   getBgX(): number;
   getBgY(): number;
   drawIcon(ctx: any, ignoreWraithShadow?: boolean): void;
   updateCollider(): void;
   setStaticAnimation(state: boolean): void;
   initDataDrawer(): void;
   updateDataDrawer(dt: number): void;
   getDataDrawer(): any;
   clearDataToDraw(): void;
   initOnSelfEmoList(): void;
   checkEmoExist(): boolean;
   getEmoLength(): number;
   removeOnSelfEmoList(index: number): void;
   getOnSelfEmoList(): any[];
   addToOnSelfEmoList(el: any): void;
   refreshEmotions(): void;
   getEmotionIndex(emo: any): number;
   addDebugOptionMenu(menu: any): void;
   createPlaceHolderCharacter(): void;
   initDynamicLightCharacterManager(): void;
   getObjectDynamicLightManager(): any;
   setPlaceHolderIcon(): void;
   getPlaceholderCharacter(): any; // HTMLImageElement?
   
   [key: string]: any;
}

