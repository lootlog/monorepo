import { Hero } from './hero';
import { Map } from './map';
import { Interface } from './interface';
import { Communication } from './communication';
import { NpcManager } from './npcs';
import { OthersManager } from './others';
import { ItemsManager } from './items';
import { Resolution } from './resolution';
import { SoundManager } from './audio';
import { WorldConfig } from './config';
import { SettingsStorage } from './settings';
import { ShowEqManager } from './show-eq';
import { Battle } from './battle';
import { ChatController } from './chat';
import { WidgetManager } from './widget-manager';
import { TutorialManager } from './tutorial-manager';
import { Matchmaking } from './matchmaking';
import { HeroEquipment } from './hero-equipment';
import { InterfaceItems } from './interface-items';
import { BuildsManager } from './builds-manager';
import { MapFilter, Weather, EarthQuakeManager } from './weather';
import { MapShift, MapGoMark } from './map-addons';
import { MiniGamesLoader } from './minigames';
import { WindowManager, WindowsData, IframeWindowManager } from './window-manager';
import { RajController, RajWindowManager } from './raj';
import { ItemsMarkManager } from './items-mark-manager';
import { FloatForegroundManager, FloatObjectManager, ScreenEffectsManager, MapBorderManager, SpecificAnimationManager, CharacterEffectsManager } from './effects';
import { RajSequenceManager, RajPreloadImage, RajAreaTriggerManager, RajHtmlCssModifierManager, RajCamera, RajYellowMessage, RajEmoActions, RajDialogue, RajSoundManager, RajMapMusicManager, RajRandomCallerManager, RajExtraLight, RajTracking, RajZoomManager, RajCanvasFilter, RajCharacterHide, RajMassObjectHide, RajEmoDefinitions, RajProgrammer } from './raj-extensions';
import { CanvasCharacterWrapperManager, HeroesRespManager, NpcIconManager, NpcTplManager, FakeNpcManager } from './characters-manager';
import { WraithCharacterManager, WraithObjectManager } from './wraith';
import { NightController, DynamicLightsManager, OverrideDayNightCycle, DynamicDirCharacterLightsManager, BehaviorDynamicLightsManager } from './night';
import { FetchData, ViewData, MovedData, DisableData, ApiData, ItemStatsData, DisableItemsManager, ItemsMovedManager } from './items-data';
import { TutorialManager, CanvasMultiGlow, HtmlMultiGlow, CanvasFocus, HtmlFocus } from './tutorial';
import { MiniMapController } from './map-controller';

import { ImgLoader } from './img-loader';
import { TplsManager } from './tpls-manager';

export interface Engine {
  hero: Hero;
  map: Map;
  interface: Interface;
  communication: Communication;
  items: ItemsManager;
  tpls: TplsManager;
  npcs: NpcManager;
  others: OthersManager;

  // Initialized in init()
  settingsStorage: SettingsStorage;
  resolution: Resolution;
  settingsOptions: any;
  ResolutionData: any;
  browserCardManager: any;
  requestCorrect: any;
  worldConfig: WorldConfig;
  imgLoader: ImgLoader;
  canvasCharacterWrapperManager: CanvasCharacterWrapperManager;
  
  // Data
  apiData: ApiData;
  itemStatsData: ItemStatsData;
  itemsFetchData: FetchData;
  itemsViewData: ViewData;
  itemsMovedData: MovedData;
  itemsDisableData: DisableData;
  
  // Raj / Graphics / Sound
  srajStore: any;
  rajController: RajController;
  rajZoomManager: RajZoomManager;
  rajCanvasFilter: RajCanvasFilter;
  mapAreaCordTriggerManager: any;
  rajHtmlCssModifierManager: RajHtmlCssModifierManager;
  rajAreaTriggerManager: RajAreaTriggerManager;
  rajSoundManager: RajSoundManager;
  rajMapMusicManager: RajMapMusicManager;
  rajSequenceManager: RajSequenceManager;
  rajPreloadImage: RajPreloadImage;
  rajRandomCallerManager: RajRandomCallerManager;
  rajYellowMessage: RajYellowMessage;
  cssLoader: any;
  rajCase: any;
  rajWindowManager: RajWindowManager;
  rajEmoActions: RajEmoActions;
  screenEffectsManager: ScreenEffectsManager;
  rajEmoDefinitions: RajEmoDefinitions;
  rajProgrammer: RajProgrammer;
  rajDialogue: RajDialogue;
  rajExtraLight: RajExtraLight;
  rajCamera: RajCamera;
  rajTracking: RajTracking;
  zoomManager: any;
  rajCharacterHide: RajCharacterHide;
  rajMassObjectHide: RajMassObjectHide;
  
  // Window / Widgets
  windowsData: WindowsData;
  widgetsData: any;
  windowCloseManager: any;
  windowManager: WindowManager;
  colorInterfaceNotificationManager: any;
  widgetManager: WidgetManager;
  console: any;
  canvasFilter: any;
  globalAddons: any;
  
  mobile: boolean;
  
  themeController: any;
  serverStorage: any;
  crossStorage: any;
  eventCollider: any;
  idleJSON: any;
  loader: any;
  lock: any;
  startFightBlockade: any;
  canvasTip: any;
  stepsToSend: any;
  renderer: any;
  GA: any;
  
  businessCardManager: any;
  codeMessageManager: any;
  deadController: any;
  
  soundManager: SoundManager;
  heroesRespManager: HeroesRespManager;
  
  npcIconManager: NpcIconManager;
  npcTplManager: NpcTplManager;
  npcs: NpcManager;
  
  fakeNpcs: FakeNpcManager;
  others: OthersManager;
  wraithCharacterManager: WraithCharacterManager;
  wraithObjectManager: WraithObjectManager;
  items: ItemsManager;
  tpls: any;
  chatLinkedItemsManager: any;
  
  emotions: any;
  
  firstLoadInit1: boolean;
  firstLoadInit2: boolean;
  firstLoadInit4: boolean;
  
  chatController: ChatController;
  
  overrideDayNightCycle: OverrideDayNightCycle;
  nightController: NightController;
  lightPoints: any;
  dynamicLightsManager: DynamicLightsManager;
  dynamicDirCharacterLightsManager: DynamicDirCharacterLightsManager;
  behaviorDynamicLightsManager: BehaviorDynamicLightsManager;
  
  interfaceTimerManager: any; // InterfaceTimerManager not found in previous steps, likely small. Keeping any or could infer.
  
  canvasMultiGlow: CanvasMultiGlow;
  htmlMultiGlow: HtmlMultiGlow;
  canvasFocus: CanvasFocus;
  htmlFocus: HtmlFocus;
  
  specificAnimationManager: SpecificAnimationManager;
  
  heroEquipment: HeroEquipment;
  interfaceItems: InterfaceItems;
  
  buildsManager: BuildsManager;
  
  mapShift: MapShift;
  earthQuakeManager: EarthQuakeManager;
  mapGoMark: MapGoMark;
  
  tutorialManager: TutorialManagerType;
  tutorials: any;
  tutorialValue: any;
  
  miniMapController: MiniMapController;
  
  blockSendNextInit: any;
  
  targets: any;
  
  weather: Weather;
  mapFilter: MapFilter;
  floatForegroundManager: FloatForegroundManager;
  floatObjectManager: FloatObjectManager;
  reconnect: any;
  whoIsHere: any;
  
  dialogue: boolean | any;
  shop: boolean | any;
  shopFilters: any;
  mails: boolean | any;
  recoveryItems: boolean | any;
  society: boolean | any;
  trade: boolean | any;
  codeProm: boolean | any;
  depo: boolean | any;
  eventCalendar: boolean | any;
  adventCalendar: boolean | any;
  book: boolean | any;
  premium: boolean | any;
  goldShop: boolean | any;
  staminaShop: boolean | any;
  draconiteShop: boolean | any;
  quests: boolean | any;
  roadDisplay: boolean | any;
  allInit: any;
  bags: any[];
  
  lag: number;
  help: boolean;
  bonusSelector: boolean;
  hotKeys: any;
  musicPanel: any;
  crafting: any;
  loggedPrice: any;
  addons: any;
  addonsPanel: any;
  banners: any;
  itemsMarkManager: ItemsMarkManager;
  itemsMovedManager: ItemsMovedManager;
  greatMerchamp: boolean;
  showEqManager: ShowEqManager;
  iframeWindowManager: IframeWindowManager;
  changePlayer: any;
  characterList: any;
  changeOutfit: any;
  chooseOutfit: any;
  conquerStats: boolean;
  catchChar: any;
  dead: boolean;
  mcAddon: boolean;
smcAddon: boolean;
  auctions: boolean;
  interfaceStart: boolean;
  reload: boolean;
  zoomFactor: any;
  canEditWidget: boolean;
  padController: any;
  matchmaking: Matchmaking;
  lootPreview: any;
  questsObserve: any;
  activityObserve: any;
  disableItemsManager: DisableItemsManager;
  tickSuccess: boolean;
  battlePass: any;
  showMiniature: boolean;
  news: boolean;
  tpScroll: boolean;
  questTracking: any;
  stickyTips: any;
  captcha: any;
  poll: any;
  rewardsCalendar: boolean;
  rewardsCalendarActive: boolean;
  battlePassActice: boolean;
  warShadow: any;
  initChanger: any;
  windowMaxZIndex: number;
  getStatsForTips: any;
  bonusReselectWindow: boolean;
  itemDetailWindows: any[];
  
  rajBattleEvents: any;
  rajCharacterImageChangerManager: any;
  rajMapEvents: any;
  rajWindowEvents: any;
  
  battle: Battle;
  characterEffectsManager: CharacterEffectsManager;
  characterEffectsMapManager: any;
  characterEffectsBattleManager: any;
  
  mapBorderManager: MapBorderManager;
  miniGames: MiniGamesLoader;
  
  // Methods
  init(): void;
  initCanvasContext(): void;
  initMapCanvasContext(): void;
  setAts(ats: number): void;
  getAts(): number;
  setWebSocketConnect(state: boolean): void;
  initAfterServerStorageLoaded(): void;
  afterServerStorageReloaded(data: string[]): void;
  fetchURISteps(): string;
  initTickWorker(): void;
  crazy(): void;
  tickWorker: Worker;
  
  // Global helpers assigned in init or used globally
  [key: string]: any;
}
